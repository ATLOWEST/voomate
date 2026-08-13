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
import {
  describeReadOnlyEndpoint,
  sealConnectionSecret,
} from '@voomate/connect/server';
import {
  agents,
  apiKeys,
  auditLogs,
  readOnlyConnections,
  readOnlyConnectionSecrets,
  tenantScope,
} from '@voomate/db';
import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { isDevelopment } from '../../config.js';
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
const connectionParams = z.object({ connectionId: uuidSchema });
const createReadConnectionSchema = z
  .object({
    agentId: uuidSchema,
    name: z.string().trim().min(1).max(80),
    endpointUrl: z.string().url().max(2_048),
  })
  .strict();

const encryptionKey = (): string => {
  const value = process.env.CONNECT_ENCRYPTION_KEY;
  if (!value || Buffer.from(value, 'base64').byteLength !== 32) {
    throw new Error('CONNECT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return value;
};

const safeEndpointOrigin = (value: string): string => {
  const url = new URL(value);
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.username || url.password || url.hash || (url.protocol !== 'https:' && !(isDevelopment && loopback))) {
    throw new Error('Live-read endpoint must use HTTPS.');
  }
  return url.origin;
};

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
  /** Safe metadata only. Ciphertext lives in a separate table with no dashboard SELECT policy. */
  app.get('/read-connections', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request) => {
    const tenant = tenantOf(request);
    const connections = await getDb()
      .select({
        id: readOnlyConnections.id,
        agentId: readOnlyConnections.agentId,
        name: readOnlyConnections.name,
        endpointUrl: readOnlyConnections.endpointUrl,
        status: readOnlyConnections.status,
        capabilities: readOnlyConnections.capabilities,
        lastVerifiedAt: readOnlyConnections.lastVerifiedAt,
        lastUsedAt: readOnlyConnections.lastUsedAt,
        lastErrorCode: readOnlyConnections.lastErrorCode,
        createdAt: readOnlyConnections.createdAt,
      })
      .from(readOnlyConnections)
      .where(tenantScope(readOnlyConnections, tenant.organizationId))
      .orderBy(desc(readOnlyConnections.createdAt));
    return { connections };
  });

  /** Creates a pull-only connection. The HMAC secret is returned once and never logged. */
  app.post('/read-connections', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request, reply) => {
    const tenant = tenantOf(request);
    const input = createReadConnectionSchema.parse(request.body);
    const endpointOrigin = safeEndpointOrigin(input.endpointUrl);
    const db = getDb();
    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, input.agentId)))
      .limit(1);
    if (!agent) throw notFound('Agent', input.agentId);

    const connectionId = randomUUID();
    const secret = `read_${randomBytes(32).toString('base64url')}`;
    const ciphertext = sealConnectionSecret(secret, encryptionKey());
    await db.transaction(async (tx) => {
      await tx.insert(readOnlyConnections).values({
        id: connectionId,
        organizationId: tenant.organizationId,
        agentId: agent.id,
        name: input.name,
        endpointUrl: input.endpointUrl,
        endpointOrigin,
      });
      await tx.insert(readOnlyConnectionSecrets).values({
        connectionId,
        organizationId: tenant.organizationId,
        ciphertext,
      });
      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'read_connection.created',
        resourceType: 'read_connection',
        resourceId: connectionId,
        metadata: { agentId: agent.id, endpointOrigin },
        ipAddress: request.ip,
      });
    });
    request.log.info({ connectionId, agentId: agent.id, endpointOrigin }, 'Read-only connection created');
    reply.status(201);
    return { connection: { id: connectionId, agentId: agent.id, name: input.name, status: 'pending' }, secret };
  });

  app.post('/read-connections/:connectionId/verify', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request) => {
    const tenant = tenantOf(request);
    const { connectionId } = connectionParams.parse(request.params);
    const db = getDb();
    const [connection] = await db
      .select({
        id: readOnlyConnections.id,
        endpointUrl: readOnlyConnections.endpointUrl,
        ciphertext: readOnlyConnectionSecrets.ciphertext,
      })
      .from(readOnlyConnections)
      .innerJoin(readOnlyConnectionSecrets, eq(readOnlyConnectionSecrets.connectionId, readOnlyConnections.id))
      .where(and(tenantScope(readOnlyConnections, tenant.organizationId), eq(readOnlyConnections.id, connectionId)))
      .limit(1);
    if (!connection) throw notFound('Read-only connection', connectionId);
    const { openConnectionSecret } = await import('@voomate/connect/server');
    const secret = openConnectionSecret(connection.ciphertext, encryptionKey());
    try {
      const capabilities = await describeReadOnlyEndpoint({
        endpoint: connection.endpointUrl,
        connectionId,
        secret,
        allowInsecureLoopback: isDevelopment,
      });
      await db.transaction(async (tx) => {
        await tx.update(readOnlyConnections).set({
          status: 'active',
          capabilities,
          lastVerifiedAt: new Date(),
          lastErrorCode: null,
          updatedAt: new Date(),
        }).where(and(tenantScope(readOnlyConnections, tenant.organizationId), eq(readOnlyConnections.id, connectionId)));
        await tx.insert(auditLogs).values({
          organizationId: tenant.organizationId,
          actorId: tenant.userId,
          action: 'read_connection.verified',
          resourceType: 'read_connection',
          resourceId: connectionId,
          metadata: { capabilities: capabilities.map(({ name }) => name) },
          ipAddress: request.ip,
        });
      });
      return { ok: true, capabilities };
    } catch (error) {
      await db.update(readOnlyConnections).set({ status: 'error', lastErrorCode: 'verification_failed', updatedAt: new Date() })
        .where(and(tenantScope(readOnlyConnections, tenant.organizationId), eq(readOnlyConnections.id, connectionId)));
      request.log.warn({ connectionId, err: error }, 'Read-only connection verification failed');
      throw new Error('Connection verification failed. Check the endpoint and secret.');
    }
  });

  app.delete('/read-connections/:connectionId', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request, reply) => {
    const tenant = tenantOf(request);
    const { connectionId } = connectionParams.parse(request.params);
    const db = getDb();
    const [revoked] = await db.update(readOnlyConnections).set({
      status: 'revoked', revokedAt: new Date(), updatedAt: new Date(),
    }).where(and(tenantScope(readOnlyConnections, tenant.organizationId), eq(readOnlyConnections.id, connectionId)))
      .returning({ id: readOnlyConnections.id });
    if (!revoked) throw notFound('Read-only connection', connectionId);
    await db.transaction(async (tx) => {
      await tx.delete(readOnlyConnectionSecrets).where(and(
        tenantScope(readOnlyConnectionSecrets, tenant.organizationId),
        eq(readOnlyConnectionSecrets.connectionId, connectionId),
      ));
      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'read_connection.revoked',
        resourceType: 'read_connection',
        resourceId: connectionId,
        ipAddress: request.ip,
      });
    });
    reply.status(204);
  });

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
