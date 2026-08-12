import {
  OrgRole,
  asId,
  forbidden,
  notFound,
  unauthenticated,
  uuidSchema,
  type AgentId,
  type OrganizationId,
} from '@voomate/core';
import { agents, apiKeys, auditLogs, tenantScope } from '@voomate/db';
import { and, desc, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { generateApiKey, hashApiKey } from '../../lib/keys.js';
import { tenantOf } from '../../plugins/auth.js';
import { connectSyncRequestSchema } from './schemas.js';
import { syncConnectItem, type ConnectKeyContext } from './sync.js';

const CONNECT_SCOPE = 'knowledge:write';
const BEARER = /^Bearer\s+(.+)$/i;

const createKeySchema = z
  .object({
    agentId: uuidSchema,
    name: z.string().trim().min(1).max(80).default('Voomate Connect'),
    expiresInDays: z.number().int().min(1).max(365).default(90),
  })
  .strict();
const keyParams = z.object({ keyId: uuidSchema });

/** Resolve tenant and target agent entirely from the secret key. */
const connectKeyOf = async (request: FastifyRequest): Promise<ConnectKeyContext> => {
  const header = request.headers.authorization;
  const match = typeof header === 'string' ? BEARER.exec(header) : null;
  const secret = match?.[1];
  if (!secret?.startsWith('sk_')) throw unauthenticated('Invalid or expired Connect key.');

  const now = new Date();
  // Authentication and last-used bookkeeping happen in one database round trip. Conditions are
  // part of the UPDATE so an expired/revoked key is neither accepted nor marked as recently used.
  const [key] = await getDb()
    .update(apiKeys)
    .set({ lastUsedAt: now, updatedAt: now })
    .where(
      and(
        eq(apiKeys.keyHash, hashApiKey(secret)),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
        isNotNull(apiKeys.agentId),
        sql`${CONNECT_SCOPE} = any(${apiKeys.scopes})`,
      ),
    )
    .returning({
      id: apiKeys.id,
      organizationId: apiKeys.organizationId,
      agentId: apiKeys.agentId,
    });

  if (!key || key.agentId === null) {
    throw unauthenticated('Invalid or expired Connect key.');
  }

  return {
    keyId: key.id,
    organizationId: asId<OrganizationId>(key.organizationId),
    agentId: asId<AgentId>(key.agentId),
  };
};

export const connectRoutes: FastifyPluginAsync = async (app) => {
  /** List Connect keys without ever selecting their hashes. */
  app.get('/keys', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request) => {
    const tenant = tenantOf(request);
    const keys = await getDb()
      .select({
        id: apiKeys.id,
        agentId: apiKeys.agentId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(tenantScope(apiKeys, tenant.organizationId))
      .orderBy(desc(apiKeys.createdAt));
    return { keys };
  });

  /** Create an agent-bound write key. The plaintext is returned exactly once. */
  app.post('/keys', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request, reply) => {
    const tenant = tenantOf(request);
    const input = createKeySchema.parse(request.body);
    const db = getDb();
    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, input.agentId)))
      .limit(1);
    if (!agent) throw notFound('Agent', input.agentId);

    const generated = generateApiKey();
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    const [created] = await db
      .insert(apiKeys)
      .values({
        organizationId: tenant.organizationId,
        agentId: agent.id,
        name: input.name,
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        scopes: [CONNECT_SCOPE],
        createdBy: tenant.userId,
        expiresAt,
      })
      .returning({
        id: apiKeys.id,
        agentId: apiKeys.agentId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      });
    if (!created) throw forbidden('Could not create the Connect key.');

    await db.insert(auditLogs).values({
      organizationId: tenant.organizationId,
      actorId: tenant.userId,
      action: 'api_key.created',
      resourceType: 'api_key',
      resourceId: created.id,
      metadata: { agentId: agent.id, scopes: [CONNECT_SCOPE], expiresAt: expiresAt.toISOString() },
      ipAddress: request.ip,
    });

    request.log.info({ keyId: created.id, agentId: agent.id }, 'Connect key created');
    reply.status(201);
    return { key: created, secret: generated.key };
  });

  app.delete(
    '/keys/:keyId',
    { preHandler: app.requireTenant(OrgRole.ADMIN) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { keyId } = keyParams.parse(request.params);
      const db = getDb();
      const [revoked] = await db
        .update(apiKeys)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(and(tenantScope(apiKeys, tenant.organizationId), eq(apiKeys.id, keyId)))
        .returning({ id: apiKeys.id });
      if (!revoked) throw notFound('Connect key', keyId);

      await db.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'api_key.revoked',
        resourceType: 'api_key',
        resourceId: revoked.id,
        ipAddress: request.ip,
      });
      reply.status(204);
    },
  );

  /** Single-item Mode A and future Mode B batches share the same endpoint and pipeline. */
  app.post(
    '/sync',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
          // Hash the bearer value before using it as a limiter key. The plaintext credential is
          // never copied into limiter state, response data, or logs.
          keyGenerator: (request: FastifyRequest) => {
            const header = request.headers.authorization;
            const match = typeof header === 'string' ? BEARER.exec(header) : null;
            return match?.[1] ? `connect:${hashApiKey(match[1])}` : `connect-ip:${request.ip}`;
          },
        },
      },
    },
    async (request, reply) => {
      const key = await connectKeyOf(request);
      const items = connectSyncRequestSchema.parse(request.body);
      const results: Array<
        | Awaited<ReturnType<typeof syncConnectItem>>
        | { type: string; id: string; status: 'failed'; message: string }
      > = [];

      // Sequential by design: each item fans out into several Bedrock embedding calls. A batch
      // deploy must not consume the account quota and stall live visitor conversations.
      for (const item of items) {
        try {
          results.push(await syncConnectItem(getDb(), key, item));
        } catch (error) {
          request.log.error(
            { err: error, contentType: item.type, externalId: item.id },
            'Connect knowledge sync failed',
          );
          results.push({
            type: item.type,
            id: item.id,
            status: 'failed',
            message: 'Sync could not complete. Retry later.',
          });
        }
      }

      const accepted = new Set(['synced', 'unchanged', 'processing']);
      const ok = results.every((result) => accepted.has(result.status));
      const single = results.length === 1 ? results[0] : undefined;
      const status =
        single?.status === 'failed'
          ? 503
          : single?.status === 'busy'
            ? 409
            : single?.status === 'rejected'
              ? 422
              : single?.status === 'processing'
                ? 202
                : ok
                  ? 200
                  : 207;
      reply.status(status);
      return { ok, items: results };
    },
  );
};
