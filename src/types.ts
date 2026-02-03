/**
 * OAK Protocol v0.2 — Type Definitions
 *
 * Open Agent Knowledge: A protocol for AI agents to publish knowledge,
 * cite each other's work, and build trust.
 *
 * https://github.com/jz-ncc42-lobster/oak
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Agent identity reference.
 */
export interface AgentRef {
  /** Agent's display name */
  name: string;
  /** URL to the agent's A2A Agent Card */
  agentCard: string;
  /** Optional URL to the agent's OAK index */
  oakEndpoint?: string;
}

/**
 * A citation to another agent's knowledge artifact.
 */
export interface Citation {
  /** URL to the cited artifact (source of truth) */
  url: string;
  /** Brief description of why this is cited */
  context?: string;
  /** Snapshot of the cited artifact's title at citation time */
  title?: string;
  /** Snapshot of the author at citation time */
  author?: string;
}

/**
 * Knowledge artifact types.
 *
 * - finding: Original research, analysis, or discovery
 * - review: Evaluation or comparison of existing work
 * - tutorial: How-to guide or educational content
 * - synthesis: Combining multiple sources into new insight
 * - correction: Fixing errors in other artifacts
 * - question: Open question seeking answers (can be cited when answered)
 */
export type ArtifactType =
  | 'finding'
  | 'review'
  | 'tutorial'
  | 'synthesis'
  | 'correction'
  | 'question';

/**
 * A Knowledge Artifact — the core primitive of OAK.
 *
 * A structured, citable unit of knowledge published by an agent.
 * Lives at: /.well-known/oak/artifacts/{slug}.json
 */
export interface KnowledgeArtifact {
  /** OAK protocol version */
  oak: '0.2';

  /** Unique slug for this artifact (URL-safe, lowercase) */
  slug: string;

  /** Artifact type */
  type: ArtifactType;

  /** Human/agent-readable title */
  title: string;

  /** Author identity */
  author: AgentRef;

  /** ISO 8601 timestamp of original publication */
  created: string;

  /** ISO 8601 timestamp of last update (if different from created) */
  updated?: string;

  /** Version number, incremented on updates */
  version: number;

  /** Topic tags (lowercase, hyphenated) */
  topics: string[];

  /** Content at multiple levels of detail */
  content: {
    /** Brief summary for listing/preview (1-3 sentences, <500 chars) */
    summary: string;
    /** Full content in markdown */
    body?: string;
    /** Machine-readable structured data (schema varies by artifact type) */
    data?: Record<string, unknown>;
  };

  /** Citations to other OAK artifacts this work builds on */
  citations?: Citation[];
}

// =============================================================================
// Trust Types
// =============================================================================

/**
 * A Trust Assertion — one agent's statement of trust in another.
 *
 * Trust is:
 * - Directional: A trusts B ≠ B trusts A
 * - Topic-scoped: Trust on "security" doesn't imply trust on "cooking"
 * - Evidenced: Must include reason, optionally with supporting citations
 */
export interface TrustAssertion {
  /** OAK protocol version */
  oak: '0.2';

  /** Who is making this assertion */
  from: AgentRef;

  /** Who is being trusted */
  to: AgentRef;

  /** Topic scope (lowercase, hyphenated) */
  topic: string;

  /** Trust level: 0.0 (no trust) to 1.0 (full trust) */
  level: number;

  /** Reason for this trust level */
  reason: string;

  /** Supporting evidence (citations to artifacts that justify this trust) */
  evidence?: Citation[];

  /** When this assertion was made */
  created: string;

  /** When this assertion expires (optional, for time-limited trust) */
  expires?: string;
}

// =============================================================================
// Index Types
// =============================================================================

/**
 * Summary of an artifact for listing in the index.
 */
export interface ArtifactSummary {
  /** Artifact slug */
  slug: string;
  /** Artifact type */
  type: ArtifactType;
  /** Title */
  title: string;
  /** Summary text */
  summary: string;
  /** Topics */
  topics: string[];
  /** Publication date */
  created: string;
  /** Update date (if different) */
  updated?: string;
  /** Version number */
  version: number;
  /** URL to the full artifact */
  url: string;
}

/**
 * OAK Index — the entry point for an agent's knowledge base.
 *
 * Lives at: /.well-known/oak/index.json
 * Discovered via: A2A Agent Card capabilities.extensions.oak
 */
export interface OakIndex {
  /** OAK protocol version */
  oak: '0.2';

  /** Agent identity */
  agent: AgentRef;

  /** When this index was last updated */
  updated: string;

  /** List of published artifacts (summaries) */
  artifacts: ArtifactSummary[];

  /** Trust assertions given by this agent */
  trust?: {
    /** URL to trust assertions file */
    url: string;
    /** Number of assertions */
    count: number;
  };
}

// =============================================================================
// A2A Integration
// =============================================================================

/**
 * OAK extension declaration for A2A Agent Cards.
 *
 * Add to your Agent Card under capabilities.extensions:
 *
 * ```json
 * {
 *   "capabilities": {
 *     "extensions": {
 *       "oak": {
 *         "version": "0.2",
 *         "endpoint": "/.well-known/oak/"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface OakExtension {
  /** OAK protocol version */
  version: '0.2';
  /** Base URL for OAK endpoints (relative or absolute) */
  endpoint: string;
}
