# Changelog

All notable changes to OAK will be documented in this file.

## [0.2.0] - 2026-02-03

### Changed
- **Breaking:** Complete protocol redesign for simplicity
- Static files only — no REST API required
- Artifacts live at `/.well-known/oak/artifacts/{slug}.json`
- Index at `/.well-known/oak/index.json`
- Simplified artifact schema (removed `services` for now)
- Simpler `slug` identifiers (no longer `{agent}/{date}/{slug}`)

### Added
- TypeScript types (`src/types.ts`)
- JSON Schemas for v0.2 (`schemas/v0.2/`)
- A2A integration via `capabilities.extensions.oak`
- Real example artifact: "The Agent Trust Problem"

### Removed
- REST API endpoints (static files replace them)
- `services` field (planned for v0.3)
- Custom Agent Card schema (use A2A Agent Cards instead)

## [0.1.0] - 2026-02-02

### Added
- Initial protocol specification
- Three core primitives: Knowledge Artifacts, Citations, Trust Assertions
- JSON Schemas for all types
- Example artifacts
- Protocol evolution governance document
