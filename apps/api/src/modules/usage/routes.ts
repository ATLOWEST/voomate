/**
 * Usage summary routes.
 *
 * Voice minutes are the expensive unit. This endpoint surfaces them as they accrue so merchants
 * see costs in real time rather than at invoice time.
 */
import { buildUsageBreakdown, OrgRole, usageRateCard, type UsageMeterKind } from '@voomate/core';
import { agents, usageRecords, tenantScope } from '@voomate/db';
import { and, eq, gte, sum } from 'drizzle-orm';
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
        agentId: usageRecords.agentId,
        agentName: agents.name,
        total: sum(usageRecords.quantity).mapWith(Number),
        estimatedCostMicrosUsd: sum(usageRecords.estimatedCostMicrosUsd).mapWith(Number),
      })
      .from(usageRecords)
      .leftJoin(
        agents,
        and(eq(usageRecords.agentId, agents.id), eq(agents.organizationId, tenant.organizationId)),
      )
      .where(
        and(
          tenantScope(usageRecords, tenant.organizationId),
          gte(usageRecords.periodHour, periodStart),
        ),
      )
      .groupBy(usageRecords.kind, usageRecords.agentId, agents.name);

    // Normalise into a map so the dashboard does not have to find-or-default.
    const summary: Partial<Record<UsageMeterKind, number>> = {};
    const summaryCostMicros: Partial<Record<UsageMeterKind, number>> = {};
    const agentSummaries = new Map<
      string,
      {
        agentId: string | null;
        agentName: string;
        totals: Partial<Record<UsageMeterKind, number>>;
        estimatedCostMicrosUsd: number;
      }
    >();
    for (const row of rows) {
      summary[row.kind] = (summary[row.kind] ?? 0) + (row.total ?? 0);
      summaryCostMicros[row.kind] =
        (summaryCostMicros[row.kind] ?? 0) + (row.estimatedCostMicrosUsd ?? 0);
      const key = row.agentId ?? 'workspace';
      const current = agentSummaries.get(key) ?? {
        agentId: row.agentId,
        agentName: row.agentName ?? 'Workspace services',
        totals: {},
        estimatedCostMicrosUsd: 0,
      };
      current.totals[row.kind] = (current.totals[row.kind] ?? 0) + (row.total ?? 0);
      current.estimatedCostMicrosUsd += row.estimatedCostMicrosUsd ?? 0;
      agentSummaries.set(key, current);
    }

    const meters = buildUsageBreakdown(summary).map((meter) => ({
      ...meter,
      estimatedProviderCostUsd: (summaryCostMicros[meter.kind] ?? 0) / 1_000_000,
    }));
    const estimatedProviderCostUsd =
      Object.values(summaryCostMicros).reduce((total, value) => total + (value ?? 0), 0) /
      1_000_000;

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
      agentRuns: summary['agent_runs'] ?? 0,
      modelInvocations: summary['model_invocations'] ?? 0,
      knowledgeQueries: summary['knowledge_queries'] ?? 0,
      liveReadCalls: summary['live_read_calls'] ?? 0,
      toolCalls: summary['tool_calls'] ?? 0,
      toolFailures: summary['tool_failures'] ?? 0,
      responseGuardInterventions: summary['response_guard_interventions'] ?? 0,
      meters,
      estimatedProviderCostUsd,
      pricing: {
        version: usageRateCard.version,
        currency: usageRateCard.currency,
        basis:
          'Provider estimate captured at event time. Subscription, included usage, and overages are separate.',
        source: usageRateCard.source,
      },
      byAgent: [...agentSummaries.values()]
        .map((agent) => ({
          agentId: agent.agentId,
          agentName: agent.agentName,
          agentRuns: agent.totals.agent_runs ?? 0,
          messages: agent.totals.text_messages ?? 0,
          toolCalls: agent.totals.tool_calls ?? 0,
          liveReadCalls: agent.totals.live_read_calls ?? 0,
          estimatedProviderCostUsd: agent.estimatedCostMicrosUsd / 1_000_000,
        }))
        .sort((left, right) => right.agentRuns - left.agentRuns),
    };
  });
};
