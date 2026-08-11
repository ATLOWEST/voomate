/**
 * Conversation read routes.
 *
 * Conversations are append-only — once a row lands here it is a historical fact. All reads
 * go through tenantScope (see packages/db/README.md).
 */
import { OrgRole, uuidSchema } from '@voomate/core';
import { conversations, messages, tenantScope } from '@voomate/db';
import { and, desc, eq, lt } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';

const paramsSchema = z.object({ conversationId: uuidSchema });
const listQuerySchema = z.object({
  agentId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export const conversationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const { agentId, limit, before } = listQuerySchema.parse(request.query);

    const conditions = [tenantScope(conversations, tenant.organizationId)];
    if (agentId !== undefined) conditions.push(eq(conversations.agentId, agentId));
    if (before !== undefined) conditions.push(lt(conversations.startedAt, new Date(before)));

    const rows = await getDb()
      .select({
        id: conversations.id,
        agentId: conversations.agentId,
        channel: conversations.channel,
        status: conversations.status,
        visitorId: conversations.visitorId,
        pageUrl: conversations.pageUrl,
        detectedLanguage: conversations.detectedLanguage,
        multilingual: conversations.multilingual,
        messageCount: conversations.messageCount,
        satisfaction: conversations.satisfaction,
        startedAt: conversations.startedAt,
        endedAt: conversations.endedAt,
      })
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.startedAt))
      .limit(limit);

    return { conversations: rows };
  });

  app.get(
    '/:conversationId',
    { preHandler: app.requireTenant(OrgRole.VIEWER) },
    async (request) => {
      const tenant = tenantOf(request);
      const { conversationId } = paramsSchema.parse(request.params);

      const [conversation] = await getDb()
        .select()
        .from(conversations)
        .where(
          and(
            tenantScope(conversations, tenant.organizationId),
            eq(conversations.id, conversationId),
          ),
        )
        .limit(1);

      if (conversation === undefined) {
        return request.server.httpErrors.notFound('Conversation not found');
      }

      const transcript = await getDb()
        .select()
        .from(messages)
        .where(
          and(
            tenantScope(messages, tenant.organizationId),
            eq(messages.conversationId, conversationId),
          ),
        )
        .orderBy(messages.createdAt);

      return { conversation, messages: transcript };
    },
  );
};
