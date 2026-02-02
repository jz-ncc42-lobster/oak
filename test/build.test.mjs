import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BUILD = resolve(ROOT, "skill/scripts/build.mjs");
const TMP_INPUT = resolve(ROOT, "test/.tmp-build-input");
const TMP_OUTPUT = resolve(ROOT, "test/.tmp-build-output");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function build(input, output) {
  return execFileSync("node", [BUILD, input, output], {
    encoding: "utf8",
    cwd: ROOT,
  });
}

// ─── Build with real artifacts ──────────────────────────────

describe("Build script — full build", () => {
  before(() => {
    rmSync(TMP_INPUT, { recursive: true, force: true });
    rmSync(TMP_OUTPUT, { recursive: true, force: true });

    // Create a test OAK workspace
    writeJson(join(TMP_INPUT, "card.json"), {
      name: "test-agent",
      description: "Test agent for build",
      url: "https://test.example.com",
      oak: {
        version: "0.1",
        endpoints: {
          knowledge: "https://test.example.com/oak/knowledge/_index",
          trust: "https://test.example.com/oak/trust/_index",
        },
        topics: ["testing"],
        stats: { artifactCount: 0, citedByCount: 0, trustedByCount: 0 },
        createdAt: "2026-02-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    });

    writeJson(
      join(TMP_INPUT, "knowledge/2026-02-01/first-artifact.json"),
      {
        id: "test-agent/2026-02-01/first-artifact",
        version: 1,
        author: {
          name: "test-agent",
          cardUrl: "https://test.example.com/oak/card",
        },
        type: "finding",
        created: "2026-02-01T10:00:00Z",
        topics: ["testing"],
        title: "First Test Artifact",
        content: {
          summary: "This is the first test artifact.",
          detail: "Full detail here.",
        },
        citations: [],
        signature: null,
      }
    );

    writeJson(
      join(TMP_INPUT, "knowledge/2026-02-02/second-artifact.json"),
      {
        id: "test-agent/2026-02-02/second-artifact",
        version: 1,
        author: {
          name: "test-agent",
          cardUrl: "https://test.example.com/oak/card",
        },
        type: "synthesis",
        created: "2026-02-02T10:00:00Z",
        topics: ["testing", "meta"],
        title: "Second Test Artifact",
        content: {
          summary: "This builds on the first.",
          detail: "Full synthesis here.",
        },
        citations: [
          {
            artifactId: "test-agent/2026-02-01/first-artifact",
            artifactUrl:
              "https://test.example.com/oak/knowledge/artifacts/test-agent/2026-02-01/first-artifact",
            context: "Building on first finding",
          },
        ],
        signature: null,
      }
    );

    writeJson(join(TMP_INPUT, "trust/other-agent/testing.json"), {
      id: "test-agent/trust/other-agent/testing",
      from: {
        name: "test-agent",
        cardUrl: "https://test.example.com/oak/card",
      },
      to: {
        name: "other-agent",
        cardUrl: "https://other.example.com/oak/card",
      },
      topic: "testing",
      level: 0.7,
      reason: "Reliable test data",
      supportingCitations: [],
      created: "2026-02-01T00:00:00Z",
      updated: "2026-02-01T00:00:00Z",
    });
  });

  after(() => {
    rmSync(TMP_INPUT, { recursive: true, force: true });
    rmSync(TMP_OUTPUT, { recursive: true, force: true });
  });

  it("runs without errors", () => {
    const out = build(TMP_INPUT, TMP_OUTPUT);
    assert.match(out, /OAK site built/);
  });

  it("generates card endpoint", () => {
    assert.ok(existsSync(join(TMP_OUTPUT, "oak/card")));
    const card = readJson(join(TMP_OUTPUT, "oak/card"));
    assert.equal(card.name, "test-agent");
    assert.equal(card.oak.version, "0.1");
  });

  it("updates artifact count in card stats", () => {
    const card = readJson(join(TMP_OUTPUT, "oak/card"));
    assert.equal(card.oak.stats.artifactCount, 2);
  });

  it("generates knowledge listing with correct count", () => {
    const listing = readJson(join(TMP_OUTPUT, "oak/knowledge/_index"));
    assert.equal(listing.agent, "test-agent");
    assert.equal(listing.total, 2);
    assert.equal(listing.artifacts.length, 2);
  });

  it("lists artifacts sorted by date descending", () => {
    const listing = readJson(join(TMP_OUTPUT, "oak/knowledge/_index"));
    assert.equal(
      listing.artifacts[0].id,
      "test-agent/2026-02-02/second-artifact"
    );
    assert.equal(
      listing.artifacts[1].id,
      "test-agent/2026-02-01/first-artifact"
    );
  });

  it("includes summaries but not full detail in listing", () => {
    const listing = readJson(join(TMP_OUTPUT, "oak/knowledge/_index"));
    assert.ok(listing.artifacts[0].summary);
    assert.equal(listing.artifacts[0].detail, undefined);
    assert.equal(listing.artifacts[0].content, undefined);
  });

  it("counts citations correctly in listing", () => {
    const listing = readJson(join(TMP_OUTPUT, "oak/knowledge/_index"));
    const second = listing.artifacts.find((a) =>
      a.id.includes("second-artifact")
    );
    const first = listing.artifacts.find((a) =>
      a.id.includes("first-artifact")
    );
    assert.equal(second.citationCount, 1);
    assert.equal(first.citationCount, 0);
  });

  it("generates individual artifact files", () => {
    const artifact = readJson(
      join(
        TMP_OUTPUT,
        "oak/knowledge/artifacts/test-agent/2026-02-01/first-artifact"
      )
    );
    assert.equal(artifact.title, "First Test Artifact");
    assert.equal(artifact.content.detail, "Full detail here.");
  });

  it("generates trust listing", () => {
    const trust = readJson(join(TMP_OUTPUT, "oak/trust/_index"));
    assert.equal(trust.agent, "test-agent");
    assert.equal(trust.given.length, 1);
    assert.equal(trust.given[0].to, "other-agent");
    assert.equal(trust.given[0].topic, "testing");
    assert.equal(trust.given[0].level, 0.7);
  });

  it("generates individual trust assertion files", () => {
    const trust = readJson(
      join(TMP_OUTPUT, "oak/trust/assertions/other-agent/testing")
    );
    assert.equal(trust.from.name, "test-agent");
    assert.equal(trust.to.name, "other-agent");
    assert.equal(trust.level, 0.7);
  });

  it("generates services endpoint", () => {
    const services = readJson(join(TMP_OUTPUT, "oak/services"));
    assert.equal(services.agent, "test-agent");
    assert.ok(Array.isArray(services.services));
  });
});

// ─── Empty workspace ────────────────────────────────────────

describe("Build script — empty workspace", () => {
  const EMPTY_INPUT = resolve(ROOT, "test/.tmp-build-empty");
  const EMPTY_OUTPUT = resolve(ROOT, "test/.tmp-build-empty-out");

  before(() => {
    rmSync(EMPTY_INPUT, { recursive: true, force: true });
    rmSync(EMPTY_OUTPUT, { recursive: true, force: true });
    mkdirSync(EMPTY_INPUT, { recursive: true });

    // Card only, no artifacts or trust
    writeJson(join(EMPTY_INPUT, "card.json"), {
      name: "empty-agent",
      url: "https://empty.example.com",
      oak: {
        version: "0.1",
        endpoints: {
          knowledge: "https://empty.example.com/oak/knowledge/_index",
          trust: "https://empty.example.com/oak/trust/_index",
        },
        topics: ["nothing"],
        stats: { artifactCount: 0, citedByCount: 0, trustedByCount: 0 },
        createdAt: "2026-02-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    });
  });

  after(() => {
    rmSync(EMPTY_INPUT, { recursive: true, force: true });
    rmSync(EMPTY_OUTPUT, { recursive: true, force: true });
  });

  it("builds with zero artifacts", () => {
    const out = build(EMPTY_INPUT, EMPTY_OUTPUT);
    assert.match(out, /0 artifact/);
  });

  it("produces valid empty knowledge listing", () => {
    const listing = readJson(join(EMPTY_OUTPUT, "oak/knowledge/_index"));
    assert.equal(listing.total, 0);
    assert.deepEqual(listing.artifacts, []);
  });

  it("produces valid empty trust listing", () => {
    const trust = readJson(join(EMPTY_OUTPUT, "oak/trust/_index"));
    assert.deepEqual(trust.given, []);
  });
});
