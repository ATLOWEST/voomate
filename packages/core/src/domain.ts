/**
 * Domain model.
 *
 * The shapes every workspace agrees on. Persistence-agnostic — the database schema in
 * `@voomate/db` maps onto these, but these types stay free of Drizzle or Postgres concepts so
 * the dashboard and widget can import them without pulling in a database driver.
 */
import type { SttLanguageCode, VoiceTier } from '@voomate/i18n';
import type {
  AgentId,
  ConversationId,
  KnowledgeDocumentId,
  KnowledgeSourceId,
  MessageId,
  OrganizationId,
  UserId,
} from './ids.js';
import type { AgentCatalogType } from './agent-catalog.js';

// --- Tenancy ---------------------------------------------------------------------------

/**
 * Ordered least to most privileged. `OWNER` is the billing contact and cannot be removed by
 * anyone but themselves — an org must always have at least one.
 */
export const OrgRole = {
  VIEWER: 'viewer',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  OWNER: 'owner',
} as const;
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const ROLE_RANK: Record<OrgRole, number> = {
  [OrgRole.VIEWER]: 0,
  [OrgRole.DEVELOPER]: 1,
  [OrgRole.ADMIN]: 2,
  [OrgRole.OWNER]: 3,
};

export const hasRole = (actual: OrgRole, required: OrgRole): boolean =>
  ROLE_RANK[actual] >= ROLE_RANK[required];

export interface Organization {
  id: OrganizationId;
  name: string;
  slug: string;
  plan: PlanTier;
  createdAt: string;
  updatedAt: string;
}

export const PlanTier = {
  FREE: 'free',
  STARTER: 'starter',
  GROWTH: 'growth',
  ENTERPRISE: 'enterprise',
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export interface OrganizationMember {
  organizationId: OrganizationId;
  userId: UserId;
  role: OrgRole;
  createdAt: string;
}

/** Resolved once per request and threaded through every repository call. */
export interface TenantContext {
  organizationId: OrganizationId;
  userId: UserId;
  role: OrgRole;
}

// --- Agent -----------------------------------------------------------------------------

export const AgentStatus = {
  /** Created but not activated. It may be configured and tested in an isolated playground. */
  DRAFT: 'draft',
  /** Live and serving visitors. */
  ACTIVE: 'active',
  /** Compatibility name for older SDK consumers. The persisted value is still `active`. */
  PUBLISHED: 'active',
  /** Temporarily disabled by the merchant; widget returns a friendly closed state. */
  PAUSED: 'paused',
  /** Safely retired. Triggers, leases and credentials are revoked; audit evidence is retained. */
  ARCHIVED: 'archived',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export interface AgentLanguageConfig {
  /** Candidate set. Max 4, one dialect per base language — see @voomate/i18n. */
  languages: readonly SttLanguageCode[];
  /** Default and fallback. Must be a member of `languages`. */
  primaryLanguage: SttLanguageCode;
  /** Enables Transcribe multi-language identification. Required for Hinglish. */
  codeSwitching: boolean;
  /** Quality ceiling we ask Polly for; actual tier may be lower and is disclosed. */
  voiceTier: VoiceTier;
  /** Per-language voice override. Falls back to the best available for that language. */
  voiceOverrides?: Readonly<Record<string, string>>;
}

export interface AgentPersona {
  /** Shown to visitors, e.g. "Aria". */
  displayName: string;
  tone: 'professional' | 'friendly' | 'concise' | 'warm';
  /** Merchant-authored guidance, injected as instructions — trusted input. */
  instructions?: string;
  /** Spoken first. Kept short: long greetings feel slow in voice. */
  greeting?: string;
  /** What to say when retrieval finds nothing. Never invent an answer. */
  fallbackMessage?: string;
  /** Topics the agent must decline, e.g. legal or medical advice. */
  restrictedTopics?: readonly string[];
}

export interface AgentAppearance {
  /** Hex. Drives the widget's accent colour. */
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  logoUrl?: string;
  /** Light/dark/auto follows the host page where detectable. */
  theme: 'light' | 'dark' | 'auto';
}

export interface Agent {
  id: AgentId;
  organizationId: OrganizationId;
  name: string;
  catalogType: AgentCatalogType;
  catalogVersion: number;
  /** The site this agent represents. Also seeds the crawl. */
  websiteUrl: string;
  status: AgentStatus;
  /** Monotonic desired-state revision used to invalidate stale runtime configuration. */
  desiredStateRevision: number;
  /** Last revision acknowledged by the runtime. Equal to desired for control-plane-hosted agents. */
  observedStateRevision: number;
  /** Opaque, revocable lease identity. Never exposed as a provider credential. */
  executionLeaseId?: string;
  executionLeaseExpiresAt?: string;
  businessProfileVersionId?: string;
  language: AgentLanguageConfig;
  persona: AgentPersona;
  appearance: AgentAppearance;
  /** Origins the widget may load on. Validated server-side against the Origin header. */
  allowedOrigins: readonly string[];
  /** Public, non-secret. Identifies the agent; exchanged for a session token. */
  embedKey: string;
  voiceEnabled: boolean;
  /** Off by default — voice recordings are biometric-adjacent. Opt-in per agent. */
  retainAudio: boolean;
  transcriptRetentionDays: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
}

// --- Knowledge --------------------------------------------------------------------------

export const KnowledgeSourceType = {
  /** Crawled from the merchant's site. */
  WEBSITE: 'website',
  /** Uploaded file — PDF, DOCX, MD. */
  DOCUMENT: 'document',
  /** Merchant-authored Q&A pair. Highest-trust content. */
  QA_PAIR: 'qa_pair',
  /** Free-text notes the merchant adds to fill gaps. */
  MANUAL_TEXT: 'manual_text',
  /** Trusted server-to-server content pushed through @voomate/connect. */
  API_SYNC: 'api_sync',
} as const;
export type KnowledgeSourceType = (typeof KnowledgeSourceType)[keyof typeof KnowledgeSourceType];

export const IngestionStatus = {
  PENDING: 'pending',
  CRAWLING: 'crawling',
  PROCESSING: 'processing',
  INDEXING: 'indexing',
  READY: 'ready',
  FAILED: 'failed',
  /** Excluded by the merchant. Retained, not indexed. */
  EXCLUDED: 'excluded',
} as const;
export type IngestionStatus = (typeof IngestionStatus)[keyof typeof IngestionStatus];

export interface KnowledgeSource {
  id: KnowledgeSourceId;
  agentId: AgentId;
  organizationId: OrganizationId;
  type: KnowledgeSourceType;
  /** Root URL for a crawl, filename for a document, null for manual entries. */
  location?: string;
  title: string;
  status: IngestionStatus;
  documentCount: number;
  /** Populated on failure so the merchant sees why, not just that. */
  errorMessage?: string;
  lastSyncedAt?: string;
  /** Re-crawl cadence in hours. Null disables automatic refresh. */
  refreshIntervalHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: KnowledgeDocumentId;
  sourceId: KnowledgeSourceId;
  agentId: AgentId;
  organizationId: OrganizationId;
  url?: string;
  title: string;
  /** Extracted, cleaned text. Untrusted — see docs/security.md. */
  content: string;
  contentHash: string;
  status: IngestionStatus;
  /**
   * Set when ingestion sanitisation spotted instruction-like patterns (hidden text,
   * imperative overrides). Flagged for merchant review rather than silently indexed.
   */
  injectionFlags?: readonly string[];
  tokenCount?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Conversation -------------------------------------------------------------------------

export const ConversationChannel = {
  VOICE: 'voice',
  TEXT: 'text',
} as const;
export type ConversationChannel = (typeof ConversationChannel)[keyof typeof ConversationChannel];

export const ConversationStatus = {
  ACTIVE: 'active',
  ENDED: 'ended',
  /** Handed to a human. The integration is Phase 5; the state exists now. */
  ESCALATED: 'escalated',
  /** Visitor left mid-conversation. Distinct from a clean end for analytics. */
  ABANDONED: 'abandoned',
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageRole = {
  VISITOR: 'visitor',
  AGENT: 'agent',
  SYSTEM: 'system',
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export interface Citation {
  documentId: KnowledgeDocumentId;
  title: string;
  url?: string;
  /** Retrieval score, for debugging weak grounding in the playground. */
  score?: number;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  organizationId: OrganizationId;
  role: MessageRole;
  content: string;
  /** Language this specific message was in — may vary within one code-switched session. */
  language?: SttLanguageCode;
  citations?: readonly Citation[];
  /**
   * Set when the visitor interrupted this agent turn. `content` is truncated to what was
   * actually heard, since that is what the visitor is responding to.
   */
  interrupted?: boolean;
  /** Per-stage latency in ms. Present on agent turns in voice conversations. */
  latency?: MessageLatency;
  /** How well the merchant's content supported this answer. Agent turns only. */
  grounding?: TurnGrounding;
  createdAt: string;
}

/**
 * How well the merchant's own content supported an answer.
 *
 * Recorded per agent turn. This is what makes a stored transcript useful for more than reading
 * back: it separates "answered from the site" from "answered from the model's imagination",
 * which are indistinguishable in the text itself and are the difference between a good agent
 * and a lawsuit.
 */
export interface TurnGrounding {
  /** Similarity of the best retrieved chunk, 0..1. Absent when retrieval returned nothing. */
  topSimilarity?: number;
  /** How many chunks cleared the similarity floor. */
  sourceCount: number;
  /** Documents actually cited in the answer. Feeds per-source usefulness. */
  citedDocumentIds: readonly KnowledgeDocumentId[];
  /** True when retrieval found nothing at all — the corpus is thin, not the question strange. */
  ungrounded: boolean;
}

export interface MessageLatency {
  sttMs?: number;
  retrievalMs?: number;
  llmFirstTokenMs?: number;
  ttsFirstChunkMs?: number;
  /** End of visitor speech → first audible syllable. The number that matters. */
  totalToFirstAudioMs?: number;
}

export interface Conversation {
  id: ConversationId;
  agentId: AgentId;
  organizationId: OrganizationId;
  channel: ConversationChannel;
  status: ConversationStatus;
  /** Anonymous, per-browser. Not a user identity. */
  visitorId: string;
  /** Page the conversation started on — useful context for the agent and for analytics. */
  pageUrl?: string;
  /** Primary language detected across the session. */
  detectedLanguage?: SttLanguageCode;
  /** True when more than one language appeared — i.e. the visitor code-switched. */
  multilingual?: boolean;
  messageCount: number;
  startedAt: string;
  endedAt?: string;
  /** Visitor-reported, when offered. */
  satisfaction?: 'positive' | 'negative';
}
