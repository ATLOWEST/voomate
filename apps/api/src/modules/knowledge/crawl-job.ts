/**
 * Crawl a website source, store what it finds, and index it.
 *
 * The seam between the crawler (which knows about HTTP and HTML and nothing about us) and the
 * ingestion pipeline (which knows about embeddings and nothing about websites). Everything
 * tenant-scoped lives here.
 *
 * Runs in-process today, started from the request that registers the source and deliberately
 * not awaited by it. That is the right shape for dev and the wrong shape for production — a
 * 5,000-page crawl belongs on the Fargate ingestion worker, not in the API process where it
 * competes with live conversations for CPU. The interface is already the one a worker would
 * consume, so moving it is a change of caller.
 */
import { createHash } from 'node:crypto';
import { IngestionStatus, type AgentId, type OrganizationId } from '@voomate/core';
import { knowledgeDocuments, knowledgeSources, type Database } from '@voomate/db';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { crawlSite, type CrawlSummary } from '../../lib/crawl/crawl.js';
import { indexPendingDocuments } from './ingest.js';

export interface CrawlJobInput {
  readonly db: Database;
  readonly log: FastifyBaseLogger;
  readonly organizationId: OrganizationId;
  readonly agentId: AgentId;
  readonly sourceId: string;
  readonly rootUrl: string;
  readonly maxPages: number;
  readonly maxDepth: number;
  readonly excludePatterns?: readonly string[];
  readonly signal?: AbortSignal;
}

/**
 * One crawl per source at a time.
 *
 * Two overlapping crawls of the same source race on the same document rows and, worse, both
 * pass the "delete anything I did not see" step at the end — so each deletes the other's pages.
 * A merchant who clicks Retry twice should get one crawl, not an empty knowledge base.
 */
const running = new Set<string>();

/** Content addresses the document: unchanged pages keep their embeddings across re-crawls. */
const hashOf = (text: string): string => createHash('sha256').update(text).digest('hex');

export const runCrawlJob = async (input: CrawlJobInput): Promise<CrawlSummary | null> => {
  const { db, log, organizationId, agentId, sourceId } = input;

  if (running.has(sourceId)) {
    log.info({ sourceId }, 'Crawl already running for this source; ignoring');
    return null;
  }
  running.add(sourceId);

  const scope = and(
    eq(knowledgeSources.organizationId, organizationId),
    eq(knowledgeSources.id, sourceId),
  );

  try {
    await db
      .update(knowledgeSources)
      .set({ status: IngestionStatus.CRAWLING, errorMessage: null, updatedAt: new Date() })
      .where(scope);

    const seenHashes: string[] = [];

    const summary = await crawlSite({
      rootUrl: input.rootUrl,
      maxPages: input.maxPages,
      maxDepth: input.maxDepth,
      excludePatterns: input.excludePatterns,
      signal: input.signal,
      onEvent: (event) => {
        if (event.kind === 'page') log.debug({ sourceId, ...event }, 'Crawled page');
        else if (event.kind === 'fail') log.info({ sourceId, ...event }, 'Page failed');
      },
      onPage: async (page) => {
        const contentHash = hashOf(page.text);
        seenHashes.push(contentHash);

        // The unique index on (source_id, content_hash) does the deduplication, so a page
        // reachable at two URLs is stored once and a page unchanged since the last crawl keeps
        // its row — and therefore its chunks, and therefore its embeddings. Re-crawling a site
        // where nothing changed should cost nothing at Bedrock.
        await db
          .insert(knowledgeDocuments)
          .values({
            organizationId,
            agentId,
            sourceId,
            url: page.url,
            title: page.title,
            content: page.text,
            contentHash,
            language: page.language,
            status: IngestionStatus.PENDING,
          })
          .onConflictDoNothing({
            target: [knowledgeDocuments.sourceId, knowledgeDocuments.contentHash],
          });

        // Progress the merchant can watch. Cheap: one small update per page, on a row nobody
        // is contending for.
        await db
          .update(knowledgeSources)
          .set({ documentCount: seenHashes.length, updatedAt: new Date() })
          .where(scope);
      },
    });

    // Pages that vanished from the site since the last crawl. Removing them is not tidiness —
    // an agent still quoting a discontinued product's page is a support problem the merchant
    // cannot see the cause of. The cascade takes the chunks with them.
    const stale = await db
      .delete(knowledgeDocuments)
      .where(
        and(
          eq(knowledgeDocuments.organizationId, organizationId),
          eq(knowledgeDocuments.sourceId, sourceId),
          seenHashes.length > 0
            ? notInArray(knowledgeDocuments.contentHash, seenHashes)
            : inArray(knowledgeDocuments.contentHash, []),
        ),
      )
      .returning({ id: knowledgeDocuments.id });

    log.info({ sourceId, ...summary, removed: stale.length }, 'Crawl finished');

    if (summary.pages === 0) {
      await db
        .update(knowledgeSources)
        .set({
          status: IngestionStatus.FAILED,
          errorMessage: describeEmptyCrawl(summary),
          documentCount: 0,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(scope);
      return summary;
    }

    // Only the new and changed pages carry PENDING, so this embeds what actually changed.
    const tally = await indexPendingDocuments(db, organizationId, agentId, sourceId, {
      onlyPending: true,
    });
    log.info({ sourceId, ...tally }, 'Indexed crawled pages');

    return summary;
  } catch (error) {
    log.error({ err: error, sourceId }, 'Crawl failed');
    await db
      .update(knowledgeSources)
      .set({
        status: IngestionStatus.FAILED,
        errorMessage: 'The crawl could not complete. Press Retry to try again.',
        updatedAt: new Date(),
      })
      .where(scope);
    return null;
  } finally {
    running.delete(sourceId);
  }
};

/**
 * Why a crawl found nothing.
 *
 * "0 pages" is the least actionable error a merchant can receive, and the three causes need
 * three different responses from them: unblock our crawler, give us a different address, or
 * wait for a feature we have not built. Saying which is the difference between a support
 * ticket and a fix.
 */
const describeEmptyCrawl = (summary: CrawlSummary): string => {
  if (summary.appShells > 0) {
    return 'The pages on this site are built by JavaScript in the browser, so there was no text to read. Add the content manually for now.';
  }
  if (summary.failed > 0) {
    return 'Every page failed to load. The site may be blocking our crawler or be unreachable.';
  }
  return 'No readable pages were found. Check the address, and that robots.txt does not block us.';
};
