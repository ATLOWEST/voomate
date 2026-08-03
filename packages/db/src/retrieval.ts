/**
 * Vector retrieval.
 *
 * The only module that reads or writes `knowledge_chunks.embedding`. Everything about
 * retrieval that is not a plain Drizzle query lives here, so "how does search actually work"
 * has one answer and one file.
 *
 * The ranking itself is a Postgres function, `match_knowledge_chunks`, defined in
 * `migrations/manual/20_pgvector_retrieval.sql`. It lives in SQL rather than here because it
 * needs `set hnsw.iterative_scan` as a function-local setting — without that the HNSW index
 * collects its candidate list *before* the `agent_id` filter is applied, so a small tenant
 * whose chunks are a rounding error in the index silently gets back fewer results than asked
 * for, or none. That failure is invisible: retrieval returns success with an empty list, and
 * the agent politely says it doesn't know.
 */
import type { AgentId, KnowledgeDocumentId, OrganizationId } from '@soniq/core';
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { EMBEDDING_DIMENSIONS } from './schema.js';

export interface RetrievedChunk {
  id: string;
  documentId: KnowledgeDocumentId;
  /** UNTRUSTED merchant-site text. Fence it before it reaches a prompt — @soniq/core. */
  content: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  language: string | null;
  ordinal: number;
  /** Cosine similarity in [-1, 1]; in practice [0, 1] for text embeddings. Higher is closer. */
  similarity: number;
}

export interface MatchOptions {
  organizationId: OrganizationId;
  agentId: AgentId;
  /** Query text already embedded with the *same* model the chunks were embedded with. */
  queryEmbedding: readonly number[];
  /** How many chunks to return. */
  limit?: number;
  /**
   * Floor on cosine similarity. Below this a chunk is noise, and feeding the model noise is
   * how a confident wrong answer gets made — an empty result that triggers the agent's "I
   * don't know" is the better outcome.
   */
  minSimilarity?: number;
}

/**
 * 8 chunks at ~512 tokens is ~4k tokens of context: enough for the model to synthesise across
 * a few pages, small enough that the relevant sentence isn't buried. Raising it trades answer
 * quality for the time-to-first-token that the voice budget is made of.
 */
const DEFAULT_LIMIT = 8;

/**
 * Empirical floor for Titan Embed v2 cosine scores. Unrelated text lands around 0.1-0.2;
 * genuinely relevant text is usually above 0.4. 0.25 sits in the gap, biased towards letting
 * a weak-but-real match through, because the model can decline to use a chunk but cannot use
 * one it never received.
 */
const DEFAULT_MIN_SIMILARITY = 0.25;

/**
 * pgvector's text input format: `[0.1,0.2,...]`.
 *
 * Built as a parameter, never interpolated. It is also validated first — a wrong-length
 * vector is rejected by Postgres anyway, but the error it raises names a type mismatch rather
 * than the actual cause, which is almost always that `EMBEDDING_MODEL_ID` changed and the
 * stored vectors are now from a different model.
 */
const toVectorLiteral = (embedding: readonly number[]): string => {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding has ${String(embedding.length)} dimensions, expected ${String(EMBEDDING_DIMENSIONS)}. ` +
        'The embedding model changed; stored vectors must be regenerated, not migrated.',
    );
  }
  for (const value of embedding) {
    if (!Number.isFinite(value)) {
      throw new Error('Embedding contains a non-finite value; refusing to store or query it.');
    }
  }
  return `[${embedding.join(',')}]`;
};

/**
 * Nearest-neighbour search within one agent's corpus.
 *
 * Scoped by organisation *and* agent, though agent alone would be sufficient — an attacker
 * needing two correct UUIDs rather than one is cheap insurance, and the org filter is what
 * makes an accidental cross-tenant leak impossible rather than merely unlikely.
 */
export const matchKnowledgeChunks = async (
  db: Database,
  options: MatchOptions,
): Promise<RetrievedChunk[]> => {
  const rows = await db.execute<{
    id: string;
    document_id: string;
    content: string;
    source_url: string | null;
    source_title: string | null;
    language: string | null;
    ordinal: number;
    similarity: number;
  }>(sql`
    select * from public.match_knowledge_chunks(
      ${options.organizationId}::uuid,
      ${options.agentId}::uuid,
      ${toVectorLiteral(options.queryEmbedding)}::extensions.vector,
      ${options.limit ?? DEFAULT_LIMIT}::integer,
      ${options.minSimilarity ?? DEFAULT_MIN_SIMILARITY}::double precision
    )
  `);

  return [...rows].map((row) => ({
    id: row.id,
    documentId: row.document_id as KnowledgeDocumentId,
    content: row.content,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    language: row.language,
    ordinal: row.ordinal,
    // Postgres `double precision` arrives as a string through some drivers. Coercing here
    // means callers can compare it to a threshold without every one of them remembering.
    similarity: Number(row.similarity),
  }));
};

export interface ChunkInsert {
  organizationId: OrganizationId;
  agentId: AgentId;
  documentId: KnowledgeDocumentId;
  ordinal: number;
  content: string;
  embedding: readonly number[];
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  language?: string | null;
  tokenCount?: number | null;
}

/**
 * Replace a document's chunks, atomically.
 *
 * Delete-then-insert in one transaction rather than an upsert. Re-chunking a changed page
 * usually produces a *different number* of chunks, so ordinals 0..n-1 from the old version
 * would linger past the end of the new one — stale content, still indexed, still retrievable,
 * and attributed to a page that no longer says it.
 *
 * The transaction is what makes the window safe: without it, a crash between delete and
 * insert leaves the agent with a document it can no longer answer from, and the publish gate
 * would happily still consider it ready.
 */
export const replaceDocumentChunks = async (
  db: Database,
  documentId: KnowledgeDocumentId,
  chunks: readonly ChunkInsert[],
): Promise<number> => {
  // Validate every vector before opening the transaction. A dimension mismatch is a
  // configuration error, and finding it mid-transaction turns it into a rollback on a table
  // that was fine a moment ago.
  const literals = chunks.map((chunk) => toVectorLiteral(chunk.embedding));

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`delete from public.knowledge_chunks where document_id = ${documentId}::uuid`,
    );
    if (chunks.length === 0) return 0;

    const values = chunks.map(
      (chunk, i) => sql`(
        ${chunk.organizationId}::uuid,
        ${chunk.agentId}::uuid,
        ${documentId}::uuid,
        ${chunk.ordinal}::integer,
        ${chunk.content},
        ${literals[i]}::extensions.vector,
        ${chunk.sourceUrl ?? null},
        ${chunk.sourceTitle ?? null},
        ${chunk.language ?? null},
        ${chunk.tokenCount ?? null}::integer
      )`,
    );

    await tx.execute(sql`
      insert into public.knowledge_chunks
        (organization_id, agent_id, document_id, ordinal, content, embedding,
         source_url, source_title, language, token_count)
      values ${sql.join(values, sql`, `)}
    `);

    return chunks.length;
  });
};

export { EMBEDDING_DIMENSIONS };
