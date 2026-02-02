#!/usr/bin/env node
/**
 * OAK Static Site Builder
 * Generates servable OAK API endpoints from local artifacts.
 *
 * Usage:
 *   node build.mjs <oak-dir> [output-dir]
 *
 * Input structure:
 *   oak-dir/
 *   ├── card.json
 *   ├── knowledge/{date}/{slug}.json
 *   └── trust/{agent}/{topic}.json
 *
 * Output structure:
 *   output-dir/
 *   ├── oak/card                    (Agent Card JSON)
 *   ├── oak/knowledge               (Artifact listing JSON)
 *   ├── oak/knowledge/{id}          (Individual artifacts)
 *   ├── oak/trust                   (Trust listing JSON)
 *   ├── oak/trust/{agent}/{topic}   (Individual assertions)
 *   └── oak/services                (Service listing JSON)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "fs";
import { join, dirname, resolve } from "path";

const oakDir = process.argv[2];
const outputDir = process.argv[3] || join(oakDir, "site");

if (!oakDir) {
  console.error("Usage: node build.mjs <oak-dir> [output-dir]");
  process.exit(1);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeJson(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function walkJson(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJson(full));
    } else if (entry.name.endsWith(".json")) {
      try {
        results.push(JSON.parse(readFileSync(full, "utf8")));
      } catch (e) {
        console.warn(`⚠️  Skipping invalid JSON: ${full}`);
      }
    }
  }
  return results;
}

console.log(`Building OAK site: ${oakDir} → ${outputDir}`);

// 1. Agent Card
const cardPath = join(oakDir, "card.json");
if (existsSync(cardPath)) {
  const card = JSON.parse(readFileSync(cardPath, "utf8"));

  // Update stats
  const artifacts = walkJson(join(oakDir, "knowledge"));
  const trustAssertions = walkJson(join(oakDir, "trust"));
  if (card.oak && card.oak.stats) {
    card.oak.stats.artifactCount = artifacts.length;
  }
  card.oak.updatedAt = new Date().toISOString();

  writeJson(join(outputDir, "oak", "card"), card);
  console.log(`✅ Card: ${card.name}`);
} else {
  console.warn("⚠️  No card.json found — skipping card endpoint");
}

// 2. Knowledge artifacts
const knowledgeDir = join(oakDir, "knowledge");
const artifacts = walkJson(knowledgeDir);

// Sort by created date descending
artifacts.sort((a, b) => new Date(b.created) - new Date(a.created));

// Build listing (summaries only)
const cardJson = existsSync(cardPath) ? JSON.parse(readFileSync(cardPath, "utf8")) : {};
const listing = {
  agent: cardJson.name || "unknown",
  total: artifacts.length,
  artifacts: artifacts.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    topics: a.topics,
    created: a.created,
    summary: a.content?.summary || "",
    citationCount: a.citations?.length || 0,
    url: `oak/knowledge/artifacts/${a.id}`,
  })),
};

writeJson(join(outputDir, "oak", "knowledge", "_index"), listing);
console.log(`✅ Knowledge listing: ${artifacts.length} artifact(s)`);

// Write individual artifacts (flatten ID slashes to prevent nesting conflicts)
for (const artifact of artifacts) {
  // Store as oak/knowledge/{agent}/{date}/{slug} in nested dirs
  const artifactPath = join(outputDir, "oak", "knowledge", "artifacts", artifact.id);
  writeJson(artifactPath, artifact);
}

// 3. Trust assertions
const trustDir = join(oakDir, "trust");
const trustAssertions = walkJson(trustDir);

const trustListing = {
  agent: cardJson.name || "unknown",
  given: trustAssertions.map((t) => ({
    to: t.to?.name,
    topic: t.topic,
    level: t.level,
    url: `oak/trust/assertions/${t.to?.name}/${t.topic}`,
  })),
  received: [],
};

writeJson(join(outputDir, "oak", "trust", "_index"), trustListing);
console.log(`✅ Trust listing: ${trustAssertions.length} assertion(s)`);

// Write individual trust assertions
for (const trust of trustAssertions) {
  const trustPath = join(outputDir, "oak", "trust", "assertions", trust.to?.name, trust.topic);
  writeJson(trustPath, trust);
}

// 4. Services (extracted from artifacts)
const allServices = [];
for (const artifact of artifacts) {
  if (artifact.services) {
    for (const service of artifact.services) {
      allServices.push({
        ...service,
        sourceArtifact: artifact.id,
      });
    }
  }
}

const servicesListing = {
  agent: cardJson.name || "unknown",
  services: allServices,
};

writeJson(join(outputDir, "oak", "services"), servicesListing);
console.log(`✅ Services: ${allServices.length} service(s)`);

console.log(`\n🌳 OAK site built at: ${outputDir}`);
console.log(`   Serve with any static file server or deploy to GitHub Pages.`);
