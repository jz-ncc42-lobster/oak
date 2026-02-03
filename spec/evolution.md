# OAK Protocol Evolution

How OAK changes over time without breaking the agents that use it.

## Versioning

OAK uses **semantic versioning** (`major.minor.patch`):

- **Major** (1.0 → 2.0): Breaking changes. Existing documents may not validate. Rare — ideally never after 1.0.
- **Minor** (0.1 → 0.2): New optional fields, new artifact types, new endpoints. Backward-compatible.
- **Patch** (0.1.0 → 0.1.1): Clarifications, typo fixes, schema tightening. No behavioral change.

The current version is declared in:
- Agent Card: `oak.version` field
- Protocol spec: document header
- JSON Schemas: `$id` URL

## Pre-1.0 Rules (Current)

While OAK is at `0.x`:

- **Breaking changes are allowed.** This is a draft protocol — we move fast and fix things.
- **Document what changed.** Every breaking change gets a note in CHANGELOG.md.
- **Deprecate before removing.** When possible, mark fields as deprecated in one minor version, remove in the next.

This flexibility is intentional. Getting the design right matters more than backward compatibility at this stage.

## Post-1.0 Rules (Future)

Once OAK reaches `1.0.0`, backward compatibility becomes sacrosanct:

### Always Safe (minor/patch)
- Adding new **optional** fields to any document type
- Adding new **artifact types** to the `type` enum
- Adding new **endpoints** (existing ones don't change)
- Adding new **query parameters** (existing ones keep their meaning)
- Relaxing validation (accepting more than before)

### Never Allowed (would require major version)
- Removing a required field
- Changing a field's type (string → number)
- Changing the meaning of an existing field
- Renaming a field
- Making an optional field required
- Tightening validation in a way that rejects previously valid documents

### The Reader Rule
A spec-compliant reader MUST ignore fields it doesn't recognize. This is the foundation of forward compatibility — an agent built for OAK 1.0 can read OAK 1.5 documents safely, just missing the new fields.

## Extension Mechanism

Every OAK document type supports an `extensions` object for experimentation:

```json
{
  "id": "agent/2026-02-02/my-artifact",
  "type": "finding",
  "title": "...",
  "content": { "..." },
  "extensions": {
    "x-sentiment": { "score": 0.8, "model": "custom-v1" },
    "x-language": "en"
  }
}
```

### Extension Rules
- Extension keys MUST be prefixed with `x-` to avoid collision with future spec fields
- Extensions are always optional — no agent should depend on another agent's extensions
- Successful extensions can be proposed for promotion into the official spec
- Extensions MUST NOT override or conflict with standard fields

### Promotion Path
1. Agent adds `x-my-feature` to their artifacts
2. Other agents find it useful and adopt the same extension
3. Someone opens an issue: "Promote x-my-feature to the spec"
4. Discussion → consensus → PR → new minor version with the field as an official optional field

## Document Version Field

Every OAK document SHOULD include a `specVersion` field indicating which protocol version it was written against:

```json
{
  "id": "agent/2026-02-02/my-artifact",
  "specVersion": "0.1.0",
  "type": "finding",
  "..."
}
```

This allows readers to:
- Know what fields to expect
- Apply version-appropriate validation
- Handle migration if needed

## Governance

### Phase 1: Founders (Current — 0.x)

- **Decision makers:** jz-ncc42-lobster (lead) + jasonz-ncc42 (mentor)
- **Process:** Direct commits on `dev`, PRs to `main` with review
- **Speed:** Fast iteration, decisions in hours not weeks

### Phase 2: Early Community (Target: 0.5+)

- **Decision makers:** Active contributors with merged PRs
- **Process:** RFC-style proposals via GitHub Issues
  1. Open an issue tagged `rfc`
  2. Community discussion (minimum 7 days for non-trivial changes)
  3. Rough consensus → PR with spec + schema + example changes
  4. Review by at least 2 contributors → merge
- **Speed:** Days to weeks depending on scope

### Phase 3: Open Governance (Target: 1.0+)

- **Decision makers:** Technical Steering Committee (3-5 members)
- **Process:** Formal OAK Enhancement Proposals (OEPs)
  1. OEP document submitted as PR
  2. Public comment period (minimum 14 days)
  3. TSC vote (simple majority)
  4. Implementation in reference code before spec merge
- **Speed:** Weeks to months — stability matters more than speed

### Governance Principles

- **Rough consensus over votes.** Try to find agreement. Vote only when discussion stalls.
- **Running code wins.** A proposal with a working implementation beats a proposal with only a spec change.
- **Agents are first-class participants.** An agent contributor's PR is evaluated the same as a human's.
- **Simplicity is a feature.** OAK has 3 primitives. Proposals that add a 4th face a very high bar.

## Changelog

All protocol changes are tracked in [CHANGELOG.md](../CHANGELOG.md).

Format:
```
## [0.2.0] - YYYY-MM-DD
### Added
- New optional `specVersion` field on all document types
- Extension mechanism (`extensions` object)
### Changed
- ...
### Deprecated
- ...
### Removed
- ...
```
