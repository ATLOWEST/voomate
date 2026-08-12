/**
 * Usage summary routes.
 *
 * Voice minutes are the expensive unit. This endpoint surfaces them as they accrue so merchants
 * see costs in real time rather than at invoice time.
 */
import { OrgRole } from '@voomate/core';
import { usageRecords, tenantScope } from '@voomate/db';
import { and, gte, sum } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';

export const usageRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Aggregated usage totals for the current billing period (calendar month UTC).
   * Returns one row per usage kind with the total quantity.
   */
  app.get('/summary', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);

    // Billing period = calendar month in UTC. Aggregating over the month means a mid-month
    // check always shows exactly what the invoice will show.
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const rows = await getDb()
      .select({
        kind: usageRecords.kind,
        total: sum(usageRecords.quantity).mapWith(Number),
      })
      .from(usageRecords)
      .where(
        and(
          tenantScope(usageRecords, tenant.organizationId),
          gte(usageRecords.periodHour, periodStart),
        ),
      )
      .groupBy(usageRecords.kind);

    // Normalise into a map so the dashboard does not have to find-or-default.
    const summary: Record<string, number> = {};
    for (const row of rows) {
      summary[row.kind] = row.total ?? 0;
    }

    return {
      periodStart: periodStart.toISOString(),
      voiceMinutes: summary['voice_minutes'] ?? 0,
      textMessages: summary['text_messages'] ?? 0,
      pagesCrawled: summary['pages_crawled'] ?? 0,
      llmInputTokens: summary['llm_input_tokens'] ?? 0,
      llmOutputTokens: summary['llm_output_tokens'] ?? 0,
      imageInputTokens: summary['image_input_tokens'] ?? 0,
      imageUploadBytes: summary['image_upload_bytes'] ?? 0,
      embeddingInputTokens: summary['embedding_input_tokens'] ?? 0,
      ttsCharacters: summary['tts_characters'] ?? 0,
    };
  });
};
