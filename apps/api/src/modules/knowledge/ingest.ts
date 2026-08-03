/**
 * Indexing a document into the retrieval corpus.
 *
 * sanitise → chunk → embed → replace. One function, because these four steps are only ever
 * correct together: chunking unsanitised text indexes an attack, embedding without chunking
 * produces one vector for a whole page that matches nothing precisely, and inserting without
 * replacing leaves the previous version's chunks retrievable.
 *
 * Runs in-process today. It is written as a pure-ish service taking an explicit `Database` so
 * that moving it to the Fargate ingestion worker in Phase 2b is a change of caller, not a
 * rewrite.
 */
import {
  IngestionStatus,
  chunkDocument,
  sanitizeUntrustedText,
  type AgentId,
  type KnowledgeDocumentId,
  type OrganizationId,
} from '@soniq/core';
import { knowledgeDocuments, replaceDocumentChunks, type Database } from '@soniq/db';
import { and, eq } from 'drizzle-orm';
import { embedBatch } from '../../lib/embeddings.js';

export interface IndexDocumentInput {
  db: Database;
  organizationId: OrganizationId;
  agentId: AgentId;
  documentId: KnowledgeDocumentId;
  /** Extracted page text. UNTRUSTED. */
  content: string;
  title: string;
  url?: string | null;
  /** BCP-47 tag of the document's own language, if the extractor determined one. */
  language?: string | null;
}

export interface IndexDocumentResult {
  status: IngestionStatus;
  chunks: number;
  /** Non-empty means the document was held for merchant review. */
  flags: readonly string[];
  /** Titan's exact count across all chunks. Drives usage metering. */
  tokens: number;
}

/**
 * Index one document, replacing any previous version of it.
 *
 * Returns rather than throws for the *content* outcomes — blocked, empty — because those are
 * facts about a merchant's page, not failures of ours, and a crawl of 500 pages should record
 * them and continue rather than abort. Genuine failures (Bedrock down, database unreachable)
 * still throw.
 */
export const indexDocument = async (input: IndexDocumentInput): Promise<IndexDocumentResult> => {
  const { db, organizationId, agentId, documentId } = input;

  const setStatus = async (
    status: IngestionStatus,
    extra: { flags?: readonly string[]; tokens?: number; error?: string } = {},
  ): Promise<void> => {
    await db
      .update(knowledgeDocuments)
      .set({
        status,
        injectionFlags: extra.flags === undefined ? null : [...extra.flags],
        tokenCount: extra.tokens ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeDocuments.organizationId, organizationId),
          eq(knowledgeDocuments.id, documentId),
        ),
      );
  };

  const sanitized = sanitizeUntrustedText(input.content);

  if (sanitized.blocked) {
    // Hidden text or smuggled control characters. The chunks are dropped, not merely left
    // unwritten: if a previous crawl indexed a clean version of this page and the page has
    // since been poisoned, leaving the old chunks in place would look fine while the merchant
    // reviews a document whose content is already live.
    await replaceDocumentChunks(db, documentId, []);
    await setStatus(IngestionStatus.EXCLUDED, { flags: sanitized.flags });
    return { status: IngestionStatus.EXCLUDED, chunks: 0, flags: sanitized.flags, tokens: 0 };
  }

  const chunks = chunkDocument(sanitized.text);

  if (chunks.length === 0) {
    // A page that extracted to nothing — a JS-only shell, an image gallery, a redirect stub.
    // READY with zero chunks would satisfy nothing and quietly pass the publish gate's
    // per-agent count if any other page succeeded, so it is a failure with a reason.
    await replaceDocumentChunks(db, documentId, []);
    await setStatus(IngestionStatus.FAILED, { flags: sanitized.flags });
    return { status: IngestionStatus.FAILED, chunks: 0, flags: sanitized.flags, tokens: 0 };
  }

  await setStatus(IngestionStatus.INDEXING, { flags: sanitized.flags });

  const embeddings = await embedBatch(chunks.map((chunk) => chunk.content));

  const written = await replaceDocumentChunks(
    db,
    documentId,
    chunks.map((chunk, i) => ({
      organizationId,
      agentId,
      documentId,
      ordinal: chunk.ordinal,
      content: chunk.content,
      embedding: embeddings[i]!.embedding,
      sourceUrl: input.url ?? null,
      sourceTitle: input.title,
      language: input.language ?? null,
      tokenCount: embeddings[i]!.inputTokens,
    })),
  );

  const tokens = embeddings.reduce((sum, e) => sum + e.inputTokens, 0);

  // Flagged-but-not-blocked documents are indexed *and* flagged. The merchant sees the flag
  // and can exclude the page; holding it unindexed instead would mean a false positive
  // silently costs them a page of their own site.
  await setStatus(IngestionStatus.READY, { flags: sanitized.flags, tokens });

  return { status: IngestionStatus.READY, chunks: written, flags: sanitized.flags, tokens };
};

/**
 * Index every pending document of a source.
 *
 * Sequential on purpose. `embedBatch` already runs 4 concurrent Bedrock calls per document;
 * multiplying that by the document count is how one merchant's crawl throttles the account
 * and stalls a live conversation on another tenant's site.
 */
export const indexPendingDocuments = async (
  db: Database,
  organizationId: OrganizationId,
  agentId: AgentId,
  sourceId: string,
): Promise<{ indexed: number; failed: number; excluded: number }> => {
  const pending = await db
    .select()
    .from(knowledgeDocuments)
    .where(
      and(
        eq(knowledgeDocuments.organizationId, organizationId),
        eq(knowledgeDocuments.sourceId, sourceId),
      ),
    );

  const tally = { indexed: 0, failed: 0, excluded: 0 };

  for (const document of pending) {
    const result = await indexDocument({
      db,
      organizationId,
      agentId,
      documentId: document.id as KnowledgeDocumentId,
      content: document.content,
      title: document.title,
      url: document.url,
    });

    if (result.status === IngestionStatus.READY) tally.indexed += 1;
    else if (result.status === IngestionStatus.EXCLUDED) tally.excluded += 1;
    else tally.failed += 1;
  }

  return tally;
};
