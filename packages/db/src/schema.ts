/**
 * Multi-tenant schema.
 *
 * Rules that apply to every table here, without exception:
 *
 *  1. Every tenant-scoped table carries `organization_id` — even when it could be derived
 *     through a join. RLS policies need it on the row itself, and the denormalisation is
 *     what keeps the policies simple enough to be obviously correct.
 *  2. Every `organization_id` is indexed. Policy evaluation runs on every query.
 *  3. Every tenant table gets an RLS policy in migrations/0001_rls_policies.sql. A new
 *     table without one is a data leak — see docs/adr/0004.
 *
 * Auth users live in Supabase's `auth.users`. We mirror the minimum we need into
 * `public.users` so we can join and enforce foreign keys without reaching into the auth
 * schema, which Supabase owns.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

/**
 * Titan Embed Text v2 output width. The model can emit 256/512/1024; we take the widest
 * because cross-lingual retrieval is the hardest thing we ask of it (see docs/languages.md)
 * and that is where the extra dimensions earn their storage.
 *
 * Changing this invalidates every stored embedding — they would have to be regenerated, not
 * migrated, because a 512-d vector is not a truncation of a 1024-d one.
 */
export const EMBEDDING_DIMENSIONS = 1024;

// --- Enums ---------------------------------------------------------------------------------

export const orgRoleEnum = pgEnum('org_role', ['viewer', 'developer', 'admin', 'owner']);
export const planTierEnum = pgEnum('plan_tier', ['free', 'starter', 'growth', 'enterprise']);
export const agentStatusEnum = pgEnum('agent_status', ['draft', 'published', 'paused']);
export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', [
  'website',
  'document',
  'qa_pair',
  'manual_text',
]);
export const ingestionStatusEnum = pgEnum('ingestion_status', [
  'pending',
  'crawling',
  'processing',
  'indexing',
  'ready',
  'failed',
  'excluded',
]);
export const conversationChannelEnum = pgEnum('conversation_channel', ['voice', 'text']);
export const conversationStatusEnum = pgEnum('conversation_status', [
  'active',
  'ended',
  'escalated',
  'abandoned',
]);
export const messageRoleEnum = pgEnum('message_role', ['visitor', 'agent', 'system']);
export const usageKindEnum = pgEnum('usage_kind', [
  'voice_minutes',
  'text_messages',
  'pages_crawled',
  'llm_input_tokens',
  'llm_output_tokens',
  'tts_characters',
]);

// --- Shared column helpers ------------------------------------------------------------------

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// --- Identity & tenancy -----------------------------------------------------------------------

/** Mirror of `auth.users`. Populated by a trigger on signup. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  ...timestamps,
});

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    plan: planTierEnum('plan').notNull().default('free'),
    ...timestamps,
  },
  (table) => [uniqueIndex('organizations_slug_idx').on(table.slug)],
);

export const organizationMembers = pgTable(
  'organization_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: orgRoleEnum('role').notNull().default('viewer'),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index('organization_members_user_idx').on(table.userId),
  ],
);

// --- Agents ------------------------------------------------------------------------------------

/**
 * Config is stored as jsonb rather than columns because it's read as a unit, evolves fast
 * during Phases 2–4, and is validated by zod at the API boundary. The shapes are
 * `AgentLanguageConfig`, `AgentPersona` and `AgentAppearance` from `@soniq/core`.
 */
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    websiteUrl: text('website_url').notNull(),
    status: agentStatusEnum('status').notNull().default('draft'),

    language: jsonb('language').notNull(),
    persona: jsonb('persona').notNull(),
    appearance: jsonb('appearance').notNull(),

    /** Origins the widget may load on. Checked server-side against the Origin header. */
    allowedOrigins: text('allowed_origins')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    /** Public identifier, not a secret. Exchanged for a short-lived session token. */
    embedKey: text('embed_key').notNull(),

    voiceEnabled: boolean('voice_enabled').notNull().default(true),
    /** Off by default. Voice recordings are biometric-adjacent — opt-in only. */
    retainAudio: boolean('retain_audio').notNull().default(false),
    transcriptRetentionDays: integer('transcript_retention_days').notNull().default(90),

    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('agents_organization_idx').on(table.organizationId),
    uniqueIndex('agents_embed_key_idx').on(table.embedKey),
  ],
);

// --- Knowledge ------------------------------------------------------------------------------------

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    type: knowledgeSourceTypeEnum('type').notNull(),
    /** Root URL for a crawl, filename for a document, null for manual entries. */
    location: text('location'),
    title: text('title').notNull(),
    status: ingestionStatusEnum('status').notNull().default('pending'),
    documentCount: integer('document_count').notNull().default(0),
    /** Crawl bounds — an unbounded crawl on a large site is a runaway cost. */
    config: jsonb('config'),
    errorMessage: text('error_message'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    refreshIntervalHours: integer('refresh_interval_hours'),
    ...timestamps,
  },
  (table) => [
    index('knowledge_sources_organization_idx').on(table.organizationId),
    index('knowledge_sources_agent_idx').on(table.agentId),
  ],
);

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
    url: text('url'),
    title: text('title').notNull(),
    /** Extracted text. UNTRUSTED — never concatenated into prompt instructions. */
    content: text('content').notNull(),
    /** Skips re-indexing unchanged pages on re-crawl. */
    contentHash: text('content_hash').notNull(),
    status: ingestionStatusEnum('status').notNull().default('pending'),
    /**
     * Instruction-like patterns spotted during sanitisation (hidden text, imperative
     * overrides). Non-empty means "hold for merchant review", not "silently index".
     */
    injectionFlags: text('injection_flags').array(),
    tokenCount: integer('token_count'),
    ...timestamps,
  },
  (table) => [
    index('knowledge_documents_organization_idx').on(table.organizationId),
    index('knowledge_documents_agent_idx').on(table.agentId),
    index('knowledge_documents_source_idx').on(table.sourceId),
    uniqueIndex('knowledge_documents_source_hash_idx').on(table.sourceId, table.contentHash),
  ],
);

/**
 * The retrieval corpus — one row per chunk, with its embedding alongside it.
 *
 * This table *is* the vector store (docs/adr/0005-supabase-pgvector.md). Two consequences
 * worth stating rather than discovering:
 *
 *  1. `content` here is a slice of `knowledge_documents.content`, and inherits its UNTRUSTED
 *     status. It is merchant-site text that will be placed in a prompt. It is never
 *     concatenated into the instruction section — see docs/security.md.
 *  2. Retrieval is scoped by `agent_id`, but `organization_id` is carried and indexed anyway.
 *     A retrieval bug that leaks across agents inside one org is a product bug; one that
 *     leaks across orgs is an incident. The RLS policy needs the column to tell them apart.
 */
export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),

    /** Position within the parent document. Lets us stitch neighbours back together. */
    ordinal: integer('ordinal').notNull(),
    /** UNTRUSTED. A slice of the parent document's extracted text. */
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),

    /**
     * Denormalised from the parent document so a citation can be built from the chunk row
     * alone. Retrieval returns chunks; making it join to produce a citation would put a join
     * on the hot path of every single answer.
     */
    sourceUrl: text('source_url'),
    sourceTitle: text('source_title'),

    /**
     * BCP-47 tag of the chunk's own language, not the agent's. A merchant site may mix
     * languages per page, and cross-lingual retrieval quality is measured per pair.
     */
    language: text('language'),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('knowledge_chunks_organization_idx').on(table.organizationId),
    // Every retrieval filters on agent before it ranks by distance. Without this the HNSW
    // index is scanned and then thrown away for other tenants' rows.
    index('knowledge_chunks_agent_idx').on(table.agentId),
    index('knowledge_chunks_document_idx').on(table.documentId),
    uniqueIndex('knowledge_chunks_document_ordinal_idx').on(table.documentId, table.ordinal),
    // The HNSW index itself is created in migrations/manual/20_pgvector_retrieval.sql —
    // Drizzle cannot express its build parameters, and they matter enough to be hand-written.
  ],
);

// --- Conversations ------------------------------------------------------------------------------------

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    channel: conversationChannelEnum('channel').notNull(),
    status: conversationStatusEnum('status').notNull().default('active'),
    /** Anonymous per-browser identifier. Not a user identity, never joined to `users`. */
    visitorId: text('visitor_id').notNull(),
    pageUrl: text('page_url'),
    detectedLanguage: text('detected_language'),
    /** True when more than one language appeared — the visitor code-switched. */
    multilingual: boolean('multilingual').notNull().default(false),
    messageCount: integer('message_count').notNull().default(0),
    satisfaction: text('satisfaction'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** Set from the agent's retention policy. A scheduled job purges past this. */
    purgeAfter: timestamp('purge_after', { withTimezone: true }),
  },
  (table) => [
    index('conversations_organization_idx').on(table.organizationId),
    index('conversations_agent_started_idx').on(table.agentId, table.startedAt),
    index('conversations_purge_idx').on(table.purgeAfter),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    /** Per-message — a single session may contain several when code-switching. */
    language: text('language'),
    /** `Citation[]` from @soniq/core. */
    citations: jsonb('citations'),
    /**
     * True when the visitor barged in over this agent turn. `content` holds what was
     * actually heard, not what was generated — the visitor is responding to the former.
     */
    interrupted: boolean('interrupted').notNull().default(false),
    /** `MessageLatency` from @soniq/core. Present on agent turns in voice conversations. */
    latency: jsonb('latency'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_organization_idx').on(table.organizationId),
    index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  ],
);

// --- Keys, usage, audit ------------------------------------------------------------------------------------

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** SHA-256 of the key. The plaintext is shown once at creation and never stored. */
    keyHash: text('key_hash').notNull(),
    /** First 8 chars, so the dashboard can show which key is which. */
    keyPrefix: text('key_prefix').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('api_keys_organization_idx').on(table.organizationId),
    uniqueIndex('api_keys_hash_idx').on(table.keyHash),
  ],
);

/**
 * Written from Phase 1, well before billing exists. Metering that starts on the day you
 * decide to charge cannot bill for the months before it — so it starts now.
 */
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    kind: usageKindEnum('kind').notNull(),
    quantity: real('quantity').notNull(),
    /** Truncated to the hour for aggregation; the raw event time is `createdAt`. */
    periodHour: timestamp('period_hour', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('usage_records_org_period_idx').on(table.organizationId, table.periodHour),
    index('usage_records_agent_idx').on(table.agentId),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    /** e.g. `agent.published`, `member.role_changed`, `api_key.revoked`. */
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    /** Before/after detail. Must never contain secrets. */
    metadata: jsonb('metadata'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_logs_org_created_idx').on(table.organizationId, table.createdAt)],
);

// --- Relations ------------------------------------------------------------------------------------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  agents: many(agents),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [agents.organizationId],
    references: [organizations.id],
  }),
  knowledgeSources: many(knowledgeSources),
  conversations: many(conversations),
}));

export const knowledgeSourcesRelations = relations(knowledgeSources, ({ one, many }) => ({
  agent: one(agents, { fields: [knowledgeSources.agentId], references: [agents.id] }),
  documents: many(knowledgeDocuments),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  source: one(knowledgeSources, {
    fields: [knowledgeDocuments.sourceId],
    references: [knowledgeSources.id],
  }),
  agent: one(agents, { fields: [knowledgeDocuments.agentId], references: [agents.id] }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(knowledgeDocuments, {
    fields: [knowledgeChunks.documentId],
    references: [knowledgeDocuments.id],
  }),
  agent: one(agents, { fields: [knowledgeChunks.agentId], references: [agents.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  agent: one(agents, { fields: [conversations.agentId], references: [agents.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

/**
 * Every tenant-scoped table, in one place.
 *
 * The RLS conformance test iterates this list and fails if any table is missing a policy —
 * which turns "someone forgot" from a silent data leak into a red test. Add new tenant
 * tables here at the same time you create them.
 */
export const TENANT_SCOPED_TABLES = [
  'agents',
  'knowledge_sources',
  'knowledge_documents',
  'knowledge_chunks',
  'conversations',
  'messages',
  'api_keys',
  'usage_records',
  'audit_logs',
  'organization_members',
] as const;
