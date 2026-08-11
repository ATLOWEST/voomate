/**
 * Orchestrator API
 *
 * This module acts as the "Brain" of the multi-agent system.
 * It intercepts incoming queries and determines which connected agent
 * should handle the request based on the agent's persona and tools.
 */
import { OrgRole, notFound, uuidSchema } from '@voomate/core';
import { agentConnections, agents, tenantScope } from '@voomate/db';
import { and, eq, or, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';

const orchestratorRequestSchema = z.object({
  sourceAgentId: uuidSchema,
  question: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['visitor', 'agent']),
        content: z.string(),
      }),
    )
    .optional(),
});

export const orchestratorRoutes: FastifyPluginAsync = async (app) => {
  app.post('/route', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request, reply) => {
    const tenant = tenantOf(request);
    const input = orchestratorRequestSchema.parse(request.body);
    const db = getDb();

    // 1. Validate source agent
    const [sourceAgent] = await db
      .select()
      .from(agents)
      .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, input.sourceAgentId)))
      .limit(1);

    if (!sourceAgent) throw notFound('Source Agent', input.sourceAgentId);

    // 2. Fetch all agents connected to this source agent
    const connections = await db
      .select({
        targetAgentId: agentConnections.targetAgentId,
        connectionType: agentConnections.connectionType,
      })
      .from(agentConnections)
      .where(
        and(
          tenantScope(agentConnections, tenant.organizationId),
          eq(agentConnections.sourceAgentId, input.sourceAgentId),
        ),
      );

    if (connections.length === 0) {
      // No connected agents, routing to self
      return {
        routedTo: sourceAgent.id,
        reason: 'No connected agents available. Routing to source agent.',
        connectionType: 'self',
      };
    }

    // 3. Fetch details of connected agents to make a routing decision
    const connectedAgentIds = connections.map((c) => c.targetAgentId);

    const targetAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        persona: agents.persona,
      })
      .from(agents)
      .where(
        and(tenantScope(agents, tenant.organizationId), inArray(agents.id, connectedAgentIds)),
      );

    // Simple keyword heuristic acting as the "Brain" for immediate value.
    // In production, this uses an LLM classifier (Nova Micro).
    const questionLower = input.question.toLowerCase();

    let bestTarget = null;
    let reason = '';

    for (const target of targetAgents) {
      const personaStr = JSON.stringify(target.persona).toLowerCase();

      if (
        questionLower.includes('ticket') ||
        questionLower.includes('order') ||
        questionLower.includes('support') ||
        personaStr.includes('integration') ||
        personaStr.includes('support')
      ) {
        bestTarget = target;
        reason = "Query matched the target agent's specialized domain (e.g. support/integration).";
        break;
      }
    }

    if (bestTarget) {
      return {
        routedTo: bestTarget.id,
        reason,
        connectionType:
          connections.find((c) => c.targetAgentId === bestTarget.id)?.connectionType || 'handoff',
      };
    }

    // Fallback to self
    return {
      routedTo: sourceAgent.id,
      reason: 'Query did not strongly match any connected agents. Handled by source agent.',
      connectionType: 'self',
    };
  });
};
