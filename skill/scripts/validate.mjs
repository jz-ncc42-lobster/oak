#!/usr/bin/env node
/**
 * OAK Schema Validator
 * Validates OAK JSON files against protocol schemas.
 *
 * Usage:
 *   node validate.mjs <type> <file>
 *
 * Types: card, knowledge, trust
 *
 * Examples:
 *   node validate.mjs card oak/card.json
 *   node validate.mjs knowledge oak/knowledge/2026-02-02/my-finding.json
 *   node validate.mjs trust oak/trust/agent-x/a2a.json
 */

import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCHEMA_MAP = {
  card: "agent-card.schema.json",
  knowledge: "knowledge-artifact.schema.json",
  trust: "trust-assertion.schema.json",
};

const type = process.argv[2];
const filePath = process.argv[3];

if (!type || !filePath) {
  console.error("Usage: node validate.mjs <card|knowledge|trust> <file.json>");
  process.exit(1);
}

if (!SCHEMA_MAP[type]) {
  console.error(`Unknown type: ${type}. Use: card, knowledge, trust`);
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Find schemas directory (relative to script location)
const schemaDir = resolve(__dirname, "../../schemas");
const schemaPath = resolve(schemaDir, SCHEMA_MAP[type]);

if (!existsSync(schemaPath)) {
  console.error(`Schema not found: ${schemaPath}`);
  console.error("Make sure the schemas/ directory exists in the OAK repo root.");
  process.exit(1);
}

let schema, data;
try {
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  data = JSON.parse(readFileSync(filePath, "utf8"));
} catch (e) {
  console.error(`JSON parse error: ${e.message}`);
  process.exit(1);
}

// Lightweight validation without external dependencies
// Checks required fields, types, and patterns from the schema
const errors = [];

function validateRequired(schema, data, path = "") {
  if (schema.required) {
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`${path}.${field}: required field missing`);
      }
    }
  }

  if (schema.properties && typeof data === "object" && data !== null) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] === undefined) continue;
      const val = data[key];
      const propPath = `${path}.${key}`;

      // Type check
      if (propSchema.type) {
        const types = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
        const actual = val === null ? "null" : Array.isArray(val) ? "array" : typeof val;
        // JSON Schema "integer" maps to JS "number" with no fractional part
        const matches = types.some((t) => {
          if (t === "integer") return typeof val === "number" && Number.isInteger(val);
          return t === actual;
        });
        if (!matches) {
          errors.push(`${propPath}: expected ${types.join("|")}, got ${actual}`);
          continue;
        }
      }

      // Enum check
      if (propSchema.enum && !propSchema.enum.includes(val)) {
        errors.push(`${propPath}: must be one of [${propSchema.enum.join(", ")}], got "${val}"`);
      }

      // Pattern check
      if (propSchema.pattern && typeof val === "string") {
        if (!new RegExp(propSchema.pattern).test(val)) {
          errors.push(`${propPath}: does not match pattern ${propSchema.pattern}`);
        }
      }

      // Min/max for numbers
      if (propSchema.minimum !== undefined && typeof val === "number" && val < propSchema.minimum) {
        errors.push(`${propPath}: must be >= ${propSchema.minimum}, got ${val}`);
      }
      if (propSchema.maximum !== undefined && typeof val === "number" && val > propSchema.maximum) {
        errors.push(`${propPath}: must be <= ${propSchema.maximum}, got ${val}`);
      }

      // MaxLength for strings
      if (propSchema.maxLength && typeof val === "string" && val.length > propSchema.maxLength) {
        errors.push(`${propPath}: exceeds max length ${propSchema.maxLength}`);
      }

      // Recurse into objects
      if (propSchema.type === "object" && typeof val === "object" && val !== null) {
        validateRequired(propSchema, val, propPath);
      }

      // Array items
      if (propSchema.type === "array" && Array.isArray(val)) {
        if (propSchema.minItems && val.length < propSchema.minItems) {
          errors.push(`${propPath}: needs at least ${propSchema.minItems} items, got ${val.length}`);
        }
        if (propSchema.items && propSchema.items.type === "object") {
          val.forEach((item, i) => validateRequired(propSchema.items, item, `${propPath}[${i}]`));
        }
        if (propSchema.items && propSchema.items.pattern) {
          val.forEach((item, i) => {
            if (typeof item === "string" && !new RegExp(propSchema.items.pattern).test(item)) {
              errors.push(`${propPath}[${i}]: does not match pattern ${propSchema.items.pattern}`);
            }
          });
        }
      }
    }
  }
}

validateRequired(schema, data, type);

if (errors.length === 0) {
  console.log(`✅ ${filePath} is valid (${type})`);
  process.exit(0);
} else {
  console.log(`❌ ${filePath} has ${errors.length} validation error(s):`);
  errors.forEach((e) => console.log(`   ${e}`));
  process.exit(1);
}
