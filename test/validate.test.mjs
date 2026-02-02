import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const VALIDATE = resolve(ROOT, "skill/scripts/validate.mjs");
const TMP = resolve(ROOT, "test/.tmp-validate");

function validate(type, filePath) {
  return execFileSync("node", [VALIDATE, type, filePath], {
    encoding: "utf8",
    cwd: ROOT,
  });
}

function validateFails(type, filePath) {
  try {
    execFileSync("node", [VALIDATE, type, filePath], {
      encoding: "utf8",
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return false; // should have thrown
  } catch (e) {
    return e.stdout || e.stderr || "failed";
  }
}

function writeTmpJson(name, data) {
  mkdirSync(TMP, { recursive: true });
  const path = resolve(TMP, name);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}

// Cleanup before/after
rmSync(TMP, { recursive: true, force: true });

// ─── Example files pass ─────────────────────────────────────

describe("Schema validation — positive cases", () => {
  it("example agent-card.json is valid", () => {
    const out = validate("card", "examples/agent-card.json");
    assert.match(out, /✅/);
  });

  it("example knowledge-artifact.json is valid", () => {
    const out = validate("knowledge", "examples/knowledge-artifact.json");
    assert.match(out, /✅/);
  });

  it("example trust-assertion.json is valid", () => {
    const out = validate("trust", "examples/trust-assertion.json");
    assert.match(out, /✅/);
  });

  it("dogfood card.json is valid", () => {
    const out = validate("card", "dogfood/card.json");
    assert.match(out, /✅/);
  });

  it("dogfood agent-protocol-landscape.json is valid", () => {
    const out = validate(
      "knowledge",
      "dogfood/knowledge/2026-02-02/agent-protocol-landscape.json"
    );
    assert.match(out, /✅/);
  });

  it("dogfood why-agent-social-platforms-fail.json is valid", () => {
    const out = validate(
      "knowledge",
      "dogfood/knowledge/2026-02-02/why-agent-social-platforms-fail.json"
    );
    assert.match(out, /✅/);
  });
});

// ─── Missing required fields ────────────────────────────────

describe("Schema validation — missing required fields", () => {
  it("rejects agent card missing name", () => {
    const path = writeTmpJson("card-no-name.json", {
      url: "https://example.com",
      oak: {
        version: "0.1",
        endpoints: {
          knowledge: "https://example.com/oak/knowledge",
          trust: "https://example.com/oak/trust",
        },
        topics: ["test"],
      },
    });
    const out = validateFails("card", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /name.*missing|required/i);
  });

  it("rejects agent card missing oak block", () => {
    const path = writeTmpJson("card-no-oak.json", {
      name: "test-agent",
      url: "https://example.com",
    });
    const out = validateFails("card", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /oak.*missing|required/i);
  });

  it("rejects knowledge artifact missing title", () => {
    const path = writeTmpJson("artifact-no-title.json", {
      id: "test/2026-01-01/no-title",
      version: 1,
      author: { name: "test", cardUrl: "https://example.com/card" },
      type: "finding",
      created: "2026-01-01T00:00:00Z",
      topics: ["test"],
      content: { summary: "A test" },
    });
    const out = validateFails("knowledge", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /title.*missing|required/i);
  });

  it("rejects knowledge artifact missing content", () => {
    const path = writeTmpJson("artifact-no-content.json", {
      id: "test/2026-01-01/no-content",
      version: 1,
      author: { name: "test", cardUrl: "https://example.com/card" },
      type: "finding",
      created: "2026-01-01T00:00:00Z",
      topics: ["test"],
      title: "Missing Content",
    });
    const out = validateFails("knowledge", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /content.*missing|required/i);
  });

  it("rejects trust assertion missing reason", () => {
    const path = writeTmpJson("trust-no-reason.json", {
      id: "test/trust/other/topic",
      from: { name: "test", cardUrl: "https://example.com/card" },
      to: { name: "other", cardUrl: "https://other.com/card" },
      topic: "testing",
      level: 0.5,
      created: "2026-01-01T00:00:00Z",
    });
    const out = validateFails("trust", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /reason.*missing|required/i);
  });
});

// ─── Wrong types ────────────────────────────────────────────

describe("Schema validation — wrong types", () => {
  it("rejects artifact version as string", () => {
    const path = writeTmpJson("artifact-version-string.json", {
      id: "test/2026-01-01/bad-version",
      version: "one",
      author: { name: "test", cardUrl: "https://example.com/card" },
      type: "finding",
      created: "2026-01-01T00:00:00Z",
      topics: ["test"],
      title: "Bad Version",
      content: { summary: "test" },
    });
    const out = validateFails("knowledge", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /version.*expected.*integer|number/i);
  });

  it("rejects trust level as string", () => {
    const path = writeTmpJson("trust-level-string.json", {
      id: "test/trust/other/topic",
      from: { name: "test", cardUrl: "https://example.com/card" },
      to: { name: "other", cardUrl: "https://other.com/card" },
      topic: "testing",
      level: "high",
      reason: "test",
      created: "2026-01-01T00:00:00Z",
    });
    const out = validateFails("trust", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /level.*expected.*number/i);
  });
});

// ─── Invalid enums ──────────────────────────────────────────

describe("Schema validation — invalid enums", () => {
  it("rejects unknown artifact type", () => {
    const path = writeTmpJson("artifact-bad-type.json", {
      id: "test/2026-01-01/bad-type",
      version: 1,
      author: { name: "test", cardUrl: "https://example.com/card" },
      type: "blog-post",
      created: "2026-01-01T00:00:00Z",
      topics: ["test"],
      title: "Bad Type",
      content: { summary: "test" },
    });
    const out = validateFails("knowledge", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /type.*must be one of/i);
  });
});

// ─── Invalid patterns ───────────────────────────────────────

describe("Schema validation — invalid patterns", () => {
  it("rejects artifact ID with wrong format", () => {
    const path = writeTmpJson("artifact-bad-id.json", {
      id: "no-slashes-here",
      version: 1,
      author: { name: "test", cardUrl: "https://example.com/card" },
      type: "finding",
      created: "2026-01-01T00:00:00Z",
      topics: ["test"],
      title: "Bad ID",
      content: { summary: "test" },
    });
    const out = validateFails("knowledge", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /id.*pattern/i);
  });

  it("rejects topics with uppercase", () => {
    const path = writeTmpJson("artifact-bad-topic.json", {
      id: "test/2026-01-01/bad-topic",
      version: 1,
      author: { name: "test", cardUrl: "https://example.com/card" },
      type: "finding",
      created: "2026-01-01T00:00:00Z",
      topics: ["BadTopic"],
      title: "Bad Topic",
      content: { summary: "test" },
    });
    const out = validateFails("knowledge", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /topic.*pattern/i);
  });

  it("rejects trust level above 1.0", () => {
    const path = writeTmpJson("trust-level-high.json", {
      id: "test/trust/other/topic",
      from: { name: "test", cardUrl: "https://example.com/card" },
      to: { name: "other", cardUrl: "https://other.com/card" },
      topic: "testing",
      level: 1.5,
      reason: "too much trust",
      created: "2026-01-01T00:00:00Z",
    });
    const out = validateFails("trust", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /level.*<=.*1/i);
  });

  it("rejects trust level below 0.0", () => {
    const path = writeTmpJson("trust-level-negative.json", {
      id: "test/trust/other/topic",
      from: { name: "test", cardUrl: "https://example.com/card" },
      to: { name: "other", cardUrl: "https://other.com/card" },
      topic: "testing",
      level: -0.5,
      reason: "negative trust",
      created: "2026-01-01T00:00:00Z",
    });
    const out = validateFails("trust", path);
    assert.ok(out, "should fail");
    assert.match(out.toString(), /level.*>=.*0/i);
  });
});

// Cleanup
rmSync(TMP, { recursive: true, force: true });
