/**
 * Knowledge source management.
 *
 * Sources are registered here; the actual crawl and ingestion run asynchronously on Fargate
 * (Phase 2). Registration returns immediately with status `pending` — a crawl can take
 * minutes, and a merchant should watch progress rather than a spinner on a hung request.
 */
import {
  IngestionStatus,
  KnowledgeSourceType,
  OrgRole,
  addManualTextSchema,
  addQaPairSchema,
  addWebsiteSourceSchema,
  notFound,
  uuidSchema,
  type OrganizationId,
} from '@soniq/core';
import { agents, knowledgeDocuments, knowledgeSources, tenantScope } from '@soniq/db';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';
import { assertCrawlableUrl } from '../../lib/url-guard.js';
import { runCrawlJob } from './crawl-job.js';
import { indexPendingDocuments } from './ingest.js';

const agentParams = z.object({ id: uuidSchema });
const sourceParams = z.object({ id: uuidSchema, sourceId: uuidSchema });

/**
 * The crawl bounds as stored on the source row.
 *
 * Parsed rather than cast on the way back out. `config` is a jsonb column, so its contents are
 * whatever some past version of this code wrote there; the defaults mean a row written before
 * these fields existed re-crawls with sane bounds instead of `undefined` pages.
 */
const crawlConfigSchema = z.object({
  maxPages: z.number().int().min(1).max(5000).default(200),
  maxDepth: z.number().int().min(1).max(10).default(3),
  excludePatterns: z.array(z.string().max(200)).max(50).default([]),
});

/**
 * Index a source's documents without failing the request that created them.
 *
 * Q&A pairs and manual text need no crawl, so indexing them inline means the merchant's
 * content is searchable by the time the dashboard refreshes. But an embedding call is a
 * network call to Bedrock: if it fails, the content is already safely stored and the source
 * simply stays `pending` for a retry. Turning that into a 500 would make the merchant think
 * their text was lost.
 */
const indexInBackground = (
  app: Parameters<FastifyPluginAsync>[0],
  organizationId: OrganizationId,
  agentId: string,
  sourceId: string,
): void => {
  void indexPendingDocuments(getDb(), organizationId, agentId as never, sourceId)
    .then((tally) => {
      app.log.info({ sourceId, ...tally }, 'Indexed knowledge source');
    })
    .catch((error: unknown) => {
      app.log.error({ err: error, sourceId }, 'Indexing failed');
      // Mark it failed rather than leaving it mid-flight. A source stuck on "working" forever
      // is indistinguishable from a hung product, and the Retry button on the dashboard only
      // appears for a source the merchant can see has stopped.
      void getDb()
        .update(knowledgeSources)
        .set({
          status: IngestionStatus.FAILED,
          errorMessage: 'Indexing could not complete. Press Retry to try again.',
          updatedAt: new Date(),
        })
        .where(
          and(tenantScope(knowledgeSources, organizationId), eq(knowledgeSources.id, sourceId)),
        )
        .catch((updateError: unknown) => {
          app.log.error({ err: updateError, sourceId }, 'Could not record the indexing failure');
        });
    });
};

/**
 * Start a crawl without holding the request open for it.
 *
 * A crawl is minutes of work, so the merchant gets a 202 and watches the source row instead.
 * `runCrawlJob` already records its own failures against that row, so nothing here needs to —
 * this catch is for the case where the job itself could not start.
 */
const crawlInBackground = (
  app: Parameters<FastifyPluginAsync>[0],
  organizationId: OrganizationId,
  agentId: string,
  sourceId: string,
  root: { url: string; maxPages: number; maxDepth: number; excludePatterns?: readonly string[] },
): void => {
  void runCrawlJob({
    db: getDb(),
    log: app.log,
    organizationId,
    agentId: agentId as never,
    sourceId,
    rootUrl: root.url,
    maxPages: root.maxPages,
    maxDepth: root.maxDepth,
    excludePatterns: root.excludePatterns,
  }).catch((error: unknown) => {
    app.log.error({ err: error, sourceId }, 'Crawl job could not start');
  });
};

/** Confirms the agent exists *within the caller's tenant* before touching child rows. */
const assertAgent = async (organizationId: OrganizationId, agentId: string): Promise<void> => {
  const [agent] = await getDb()
    .select({ id: agents.id })
    .from(agents)
    .where(and(tenantScope(agents, organizationId), eq(agents.id, agentId)))
    .limit(1);
  if (agent === undefined) throw notFound('Agent', agentId);
};

export const knowledgeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:id/knowledge', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = agentParams.parse(request.params);
    await assertAgent(tenant.organizationId, id);

    const sources = await getDb()
      .select()
      .from(knowledgeSources)
      .where(
        and(tenantScope(knowledgeSources, tenant.organizationId), eq(knowledgeSources.agentId, id)),
      )
      .orderBy(desc(knowledgeSources.createdAt));

    return { sources };
  });

  /** Register a website crawl. */
  app.post(
    '/:id/knowledge/website',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id } = agentParams.parse(request.params);
      const input = addWebsiteSourceSchema.parse(request.body);
      await assertAgent(tenant.organizationId, id);

      // The crawler fetches this URL server-side, so an unchecked value is an SSRF vector
      // straight into our VPC. Checked here and again at fetch time, since DNS can change
      // between the two (rebinding).
      await assertCrawlableUrl(input.url);

      const [source] = await getDb()
        .insert(knowledgeSources)
        .values({
          organizationId: tenant.organizationId,
          agentId: id,
          type: KnowledgeSourceType.WEBSITE,
          location: input.url,
          title: new URL(input.url).hostname,
          status: IngestionStatus.PENDING,
          config: {
            maxPages: input.maxPages,
            maxDepth: input.maxDepth,
            excludePatterns: input.excludePatterns ?? [],
          },
          refreshIntervalHours: input.refreshIntervalHours ?? null,
        })
        .returning();

      request.log.info({ sourceId: source!.id, url: input.url }, 'Crawl source registered');

      crawlInBackground(app, tenant.organizationId, id, source!.id, {
        url: input.url,
        maxPages: input.maxPages,
        maxDepth: input.maxDepth,
        excludePatterns: input.excludePatterns,
      });

      reply.status(202);
      return { source };
    },
  );

  /** Merchant-authored Q&A — the highest-trust content we hold, and it needs no crawl. */
  app.post(
    '/:id/knowledge/qa',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id } = agentParams.parse(request.params);
      const input = addQaPairSchema.parse(request.body);
      await assertAgent(tenant.organizationId, id);

      const db = getDb();
      const source = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(knowledgeSources)
          .values({
            organizationId: tenant.organizationId,
            agentId: id,
            type: KnowledgeSourceType.QA_PAIR,
            title: input.question,
            status: IngestionStatus.PENDING,
            documentCount: 1,
          })
          .returning();

        await tx.insert(knowledgeDocuments).values({
          organizationId: tenant.organizationId,
          agentId: id,
          sourceId: created!.id,
          title: input.question,
          content: `Q: ${input.question}\n\nA: ${input.answer}`,
          contentHash: crypto.randomUUID(),
          status: IngestionStatus.PENDING,
        });

        return created!;
      });

      indexInBackground(app, tenant.organizationId, id, source.id);

      reply.status(201);
      return { source };
    },
  );

  app.post(
    '/:id/knowledge/text',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id } = agentParams.parse(request.params);
      const input = addManualTextSchema.parse(request.body);
      await assertAgent(tenant.organizationId, id);

      const db = getDb();
      const source = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(knowledgeSources)
          .values({
            organizationId: tenant.organizationId,
            agentId: id,
            type: KnowledgeSourceType.MANUAL_TEXT,
            title: input.title,
            status: IngestionStatus.PENDING,
            documentCount: 1,
          })
          .returning();

        await tx.insert(knowledgeDocuments).values({
          organizationId: tenant.organizationId,
          agentId: id,
          sourceId: created!.id,
          title: input.title,
          content: input.content,
          contentHash: crypto.randomUUID(),
          status: IngestionStatus.PENDING,
        });

        return created!;
      });

      indexInBackground(app, tenant.organizationId, id, source.id);

      reply.status(201);
      return { source };
    },
  );

  /**
   * Re-index a source on demand.
   *
   * The retry path for anything that ended `pending` or `failed` — a Bedrock throttle during
   * the original request, an embedding-model change that invalidated every stored vector, or
   * a merchant clearing an injection flag. Idempotent: `replaceDocumentChunks` deletes before
   * it inserts, so running it twice costs embeddings and changes nothing else.
   *
   * For a website source this re-crawls rather than re-embedding what is already stored. The
   * merchant pressing Retry after editing their returns page means "go and read it again", and
   * re-embedding the stale copy would produce the same wrong answer slightly more expensively.
   */
  app.post(
    '/:id/knowledge/:sourceId/reindex',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id, sourceId } = sourceParams.parse(request.params);
      await assertAgent(tenant.organizationId, id);

      const [source] = await getDb()
        .select({
          id: knowledgeSources.id,
          type: knowledgeSources.type,
          location: knowledgeSources.location,
          config: knowledgeSources.config,
        })
        .from(knowledgeSources)
        .where(
          and(
            tenantScope(knowledgeSources, tenant.organizationId),
            eq(knowledgeSources.id, sourceId),
          ),
        )
        .limit(1);

      if (source === undefined) throw notFound('Knowledge source', sourceId);

      if (source.type === KnowledgeSourceType.WEBSITE && source.location !== null) {
        // Re-validated rather than trusted from storage: this row may have been written before
        // the guard existed, or the hostname may since have started resolving somewhere private.
        await assertCrawlableUrl(source.location);

        const config = crawlConfigSchema.parse(source.config ?? {});
        crawlInBackground(app, tenant.organizationId, id, sourceId, {
          url: source.location,
          ...config,
        });

        reply.status(202);
        return { sourceId, status: IngestionStatus.CRAWLING };
      }

      indexInBackground(app, tenant.organizationId, id, sourceId);

      reply.status(202);
      return { sourceId, status: IngestionStatus.INDEXING };
    },
  );

  /** Documents within a source — powers the "review what we learned" table. */
  app.get(
    '/:id/knowledge/:sourceId/documents',
    { preHandler: app.requireTenant(OrgRole.VIEWER) },
    async (request) => {
      const tenant = tenantOf(request);
      const { id, sourceId } = sourceParams.parse(request.params);
      await assertAgent(tenant.organizationId, id);

      const documents = await getDb()
        .select({
          id: knowledgeDocuments.id,
          url: knowledgeDocuments.url,
          title: knowledgeDocuments.title,
          status: knowledgeDocuments.status,
          tokenCount: knowledgeDocuments.tokenCount,
          // Surfaced so merchants can review pages that tripped injection heuristics —
          // see docs/security.md. Flagged content is held, not silently indexed.
          injectionFlags: knowledgeDocuments.injectionFlags,
          updatedAt: knowledgeDocuments.updatedAt,
        })
        .from(knowledgeDocuments)
        .where(
          and(
            tenantScope(knowledgeDocuments, tenant.organizationId),
            eq(knowledgeDocuments.sourceId, sourceId),
          ),
        )
        .orderBy(desc(knowledgeDocuments.updatedAt))
        .limit(500);

      return { documents };
    },
  );

  app.delete(
    '/:id/knowledge/:sourceId',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id, sourceId } = sourceParams.parse(request.params);
      await assertAgent(tenant.organizationId, id);

      const [deleted] = await getDb()
        .delete(knowledgeSources)
        .where(
          and(
            tenantScope(knowledgeSources, tenant.organizationId),
            eq(knowledgeSources.id, sourceId),
          ),
        )
        .returning({ id: knowledgeSources.id });

      if (deleted === undefined) throw notFound('Knowledge source', sourceId);

      // The vectors go with the row: knowledge_chunks cascades from knowledge_documents,
      // which cascades from here. That matters beyond tidiness — a deletion request that
      // left content still retrievable would be a compliance failure, not just a bug, and
      // making it a foreign key is what stops it depending on anyone remembering.
      reply.status(204);
    },
  );
};
