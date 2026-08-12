import { createHash, randomUUID } from 'node:crypto';
import {
  IngestionStatus,
  KnowledgeSourceType,
  asId,
  type AgentId,
  type KnowledgeDocumentId,
  type OrganizationId,
} from '@voomate/core';
import {
  auditLogs,
  agentRunEvents,
  knowledgeDocuments,
  knowledgeSources,
  usageRecords,
  type Database,
} from '@voomate/db';
import { and, eq, sql } from 'drizzle-orm';
import { indexDocument } from '../knowledge/ingest.js';
import type { ConnectSyncItem } from './schemas.js';

const CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;
const DOCUMENT_EXTERNAL_ID = 'content';

export interface ConnectKeyContext {
  keyId: string;
  organizationId: OrganizationId;
  agentId: AgentId;
}

export type ConnectSyncResult =
  | {
      type: string;
      id: string;
      status: 'synced';
      sourceId: string;
      chunks: number;
      embeddingTokens: number;
    }
  | {
      type: string;
      id: string;
      status: 'unchanged' | 'processing';
      sourceId: string;
      chunks: 0;
      embeddingTokens: 0;
    }
  | {
      type: string;
      id: string;
      status: 'rejected' | 'busy';
      sourceId: string;
      chunks: 0;
      embeddingTokens: 0;
      message: string;
    };

const normalizeContent = (content: string): string =>
  content
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

const contentHashOf = (content: string): string =>
  createHash('sha256').update(content).digest('hex');

const hour = (at: Date): Date => {
  const value = new Date(at);
  value.setUTCMinutes(0, 0, 0);
  return value;
};

interface Claim {
  sourceId: string;
  documentId: KnowledgeDocumentId;
  state: 'claimed' | 'unchanged' | 'processing' | 'rejected' | 'busy';
}

/**
 * Atomically claim one developer-owned item for indexing.
 *
 * The advisory lock exists only for this short database transaction. Bedrock is never called
 * while it is held. A second request for the same item sees `indexing` and exits without paying
 * for a duplicate embedding; a competing update gets `busy` and the SDK retries it later.
 */
const claimItem = async (
  db: Database,
  key: ConnectKeyContext,
  item: ConnectSyncItem,
  content: string,
  contentHash: string,
): Promise<Claim> => {
  // `id` alone is the developer's identity contract. `type` is descriptive metadata and may
  // legitimately change (for example, `service` renamed to `plan`) without appending a stale
  // second source.
  const externalId = item.id;
  const title = item.metadata.title ?? `${item.type}: ${item.id}`;
  const sourceUrl = item.metadata.sourceUrl ?? null;
  const lockKey = `${key.organizationId}:${key.agentId}:${externalId}`;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

    const [source] = await tx
      .insert(knowledgeSources)
      .values({
        organizationId: key.organizationId,
        agentId: key.agentId,
        type: KnowledgeSourceType.API_SYNC,
        externalId,
        location: item.id,
        title,
        status: IngestionStatus.PENDING,
        documentCount: 1,
        config: { contentType: item.type, metadata: item.metadata },
      })
      .onConflictDoUpdate({
        target: [
          knowledgeSources.organizationId,
          knowledgeSources.agentId,
          knowledgeSources.type,
          knowledgeSources.externalId,
        ],
        set: {
          location: item.id,
          title,
          config: { contentType: item.type, metadata: item.metadata },
          updatedAt: new Date(),
        },
      })
      .returning({ id: knowledgeSources.id });
    if (!source) throw new Error('Could not claim the knowledge source.');

    const [existing] = await tx
      .select({
        id: knowledgeDocuments.id,
        contentHash: knowledgeDocuments.contentHash,
        status: knowledgeDocuments.status,
        updatedAt: knowledgeDocuments.updatedAt,
      })
      .from(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.organizationId, key.organizationId),
          eq(knowledgeDocuments.sourceId, source.id),
          eq(knowledgeDocuments.externalId, DOCUMENT_EXTERNAL_ID),
        ),
      )
      .limit(1);

    if (existing) {
      const claimIsFresh =
        existing.status === IngestionStatus.INDEXING &&
        Date.now() - existing.updatedAt.getTime() < CLAIM_STALE_AFTER_MS;

      if (existing.contentHash === contentHash) {
        if (existing.status === IngestionStatus.READY) {
          return {
            sourceId: source.id,
            documentId: asId<KnowledgeDocumentId>(existing.id),
            state: 'unchanged',
          };
        }
        if (existing.status === IngestionStatus.EXCLUDED) {
          return {
            sourceId: source.id,
            documentId: asId<KnowledgeDocumentId>(existing.id),
            state: 'rejected',
          };
        }
        if (claimIsFresh) {
          return {
            sourceId: source.id,
            documentId: asId<KnowledgeDocumentId>(existing.id),
            state: 'processing',
          };
        }
      } else if (claimIsFresh) {
        return {
          sourceId: source.id,
          documentId: asId<KnowledgeDocumentId>(existing.id),
          state: 'busy',
        };
      }

      const [document] = await tx
        .update(knowledgeDocuments)
        .set({
          title,
          url: sourceUrl,
          content,
          contentHash,
          language: item.metadata.language ?? null,
          metadata: item.metadata,
          status: IngestionStatus.INDEXING,
          injectionFlags: null,
          tokenCount: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(knowledgeDocuments.organizationId, key.organizationId),
            eq(knowledgeDocuments.id, existing.id),
          ),
        )
        .returning({ id: knowledgeDocuments.id });
      if (!document) throw new Error('Could not update the knowledge document.');

      await tx
        .update(knowledgeSources)
        .set({ status: IngestionStatus.INDEXING, errorMessage: null, updatedAt: new Date() })
        .where(
          and(
            eq(knowledgeSources.organizationId, key.organizationId),
            eq(knowledgeSources.id, source.id),
          ),
        );
      return {
        sourceId: source.id,
        documentId: asId<KnowledgeDocumentId>(document.id),
        state: 'claimed',
      };
    }

    const [document] = await tx
      .insert(knowledgeDocuments)
      .values({
        organizationId: key.organizationId,
        agentId: key.agentId,
        sourceId: source.id,
        externalId: DOCUMENT_EXTERNAL_ID,
        url: sourceUrl,
        title,
        content,
        contentHash,
        language: item.metadata.language ?? null,
        metadata: item.metadata,
        status: IngestionStatus.INDEXING,
      })
      .returning({ id: knowledgeDocuments.id });
    if (!document) throw new Error('Could not create the knowledge document.');

    await tx
      .update(knowledgeSources)
      .set({ status: IngestionStatus.INDEXING, errorMessage: null, updatedAt: new Date() })
      .where(
        and(
          eq(knowledgeSources.organizationId, key.organizationId),
          eq(knowledgeSources.id, source.id),
        ),
      );
    return {
      sourceId: source.id,
      documentId: asId<KnowledgeDocumentId>(document.id),
      state: 'claimed',
    };
  });
};

const recordAudit = async (
  db: Database,
  key: ConnectKeyContext,
  result: ConnectSyncResult,
): Promise<void> => {
  const publicSafeMetadata = {
    contentType: result.type,
    externalId: result.id,
    status: result.status,
    chunks: result.chunks,
    embeddingTokens: result.embeddingTokens,
  };
  await Promise.all([
    db.insert(auditLogs).values({
      organizationId: key.organizationId,
      action: 'knowledge.sync',
      resourceType: 'knowledge_source',
      resourceId: result.sourceId,
      metadata: { keyId: key.keyId, ...publicSafeMetadata },
    }),
    db.insert(agentRunEvents).values({
      organizationId: key.organizationId,
      agentId: key.agentId,
      runId: randomUUID(),
      stage: 'knowledge_sync',
      status:
        result.status === 'synced' ||
        result.status === 'unchanged' ||
        result.status === 'processing'
          ? 'success'
          : 'error',
      metadata: publicSafeMetadata,
    }),
  ]);
};

export const syncConnectItem = async (
  db: Database,
  key: ConnectKeyContext,
  item: ConnectSyncItem,
): Promise<ConnectSyncResult> => {
  const content = normalizeContent(item.content);
  const contentHash = contentHashOf(content);
  const claim = await claimItem(db, key, item, content, contentHash);

  if (claim.state !== 'claimed') {
    const result: ConnectSyncResult =
      claim.state === 'busy'
        ? {
            type: item.type,
            id: item.id,
            status: 'busy',
            sourceId: claim.sourceId,
            chunks: 0,
            embeddingTokens: 0,
            message: 'A newer version is still being indexed. Retry shortly.',
          }
        : claim.state === 'rejected'
          ? {
              type: item.type,
              id: item.id,
              status: 'rejected',
              sourceId: claim.sourceId,
              chunks: 0,
              embeddingTokens: 0,
              message: 'The content was rejected by knowledge safety validation.',
            }
          : {
              type: item.type,
              id: item.id,
              status: claim.state,
              sourceId: claim.sourceId,
              chunks: 0,
              embeddingTokens: 0,
            };
    await recordAudit(db, key, result);
    return result;
  }

  try {
    const indexed = await indexDocument({
      db,
      organizationId: key.organizationId,
      agentId: key.agentId,
      documentId: claim.documentId,
      content,
      title: item.metadata.title ?? `${item.type}: ${item.id}`,
      url: item.metadata.sourceUrl ?? null,
      language: item.metadata.language ?? null,
    });

    await db
      .update(knowledgeSources)
      .set({
        status: indexed.status,
        documentCount: 1,
        errorMessage:
          indexed.status === IngestionStatus.READY
            ? null
            : 'The content was rejected by knowledge safety validation.',
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeSources.organizationId, key.organizationId),
          eq(knowledgeSources.id, claim.sourceId),
        ),
      );

    const result: ConnectSyncResult =
      indexed.status === IngestionStatus.READY
        ? {
            type: item.type,
            id: item.id,
            status: 'synced',
            sourceId: claim.sourceId,
            chunks: indexed.chunks,
            embeddingTokens: indexed.tokens,
          }
        : {
            type: item.type,
            id: item.id,
            status: 'rejected',
            sourceId: claim.sourceId,
            chunks: 0,
            embeddingTokens: 0,
            message: 'The content was rejected by knowledge safety validation.',
          };

    if (indexed.tokens > 0) {
      const now = new Date();
      await db.insert(usageRecords).values({
        organizationId: key.organizationId,
        agentId: key.agentId,
        kind: 'embedding_input_tokens',
        quantity: indexed.tokens,
        periodHour: hour(now),
        createdAt: now,
      });
    }
    await recordAudit(db, key, result);
    return result;
  } catch (error) {
    await Promise.all([
      db
        .update(knowledgeDocuments)
        .set({ status: IngestionStatus.FAILED, updatedAt: new Date() })
        .where(
          and(
            eq(knowledgeDocuments.organizationId, key.organizationId),
            eq(knowledgeDocuments.id, claim.documentId),
          ),
        ),
      db
        .update(knowledgeSources)
        .set({
          status: IngestionStatus.FAILED,
          errorMessage: 'Sync could not complete. Retry the update.',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(knowledgeSources.organizationId, key.organizationId),
            eq(knowledgeSources.id, claim.sourceId),
          ),
        ),
    ]).catch(() => undefined);
    throw error;
  }
};
