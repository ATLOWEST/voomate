/**
 * Widget-facing endpoints.
 *
 * These are the only routes reachable from arbitrary websites, by anonymous visitors. They
 * are the product's most exposed surface and are treated accordingly:
 *
 *   - No Supabase JWT. Authentication is the embed key plus an origin check.
 *   - The origin comes from the `Origin` HEADER, never the request body. A client-supplied
 *     origin would make the allowlist decorative.
 *   - The embed key is public (it ships in page HTML). It is not a credential; it is
 *     exchanged for a short-lived, tightly-scoped session token.
 *   - Tight rate limits — a voice session costs real money per minute.
 */
import { randomUUID } from 'node:crypto';
import {
  AgentStatus,
  AppError,
  ErrorCode,
  createWidgetSessionSchema,
  unauthenticated,
  webDeploymentPolicyFromAppearance,
  type AgentAppearance,
  type AgentId,
  type AgentLanguageConfig,
  type AgentPersona,
  type OrganizationId,
} from '@voomate/core';
import { agents, apiKeys, auditLogs } from '@voomate/db';
import { buildTranscribeConfig, findBilingualVoice, resolveVoice } from '@voomate/i18n';
import { and, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { isProduction } from '../../config.js';
import { hashApiKey, normalizeOrigin } from '../../lib/keys.js';
import { RedisRateLimitStore } from '../../lib/redis-rate-limit-store.js';
import { mintWidgetToken } from './token.js';
import {
  mintWebAgentIdentity,
  WEB_AGENT_IDENTITY_SCOPE,
  WEB_AGENT_INSTALL_SCOPE,
} from './identity.js';

const IDENTITY_BEARER = /^Bearer\s+(.+)$/i;
const identityRequestSchema = z
  .object({
    userId: z.string().trim().min(1).max(200),
    origin: z.string().url().max(2_048),
  })
  .strict();
const installationClaimSchema = z
  .object({
    origin: z.string().url().max(2_048),
    pathname: z.string().min(1).max(240).optional(),
    routes: z
      .array(
        z.object({
          pathname: z.string().min(1).max(240),
          name: z.string().trim().min(1).max(120).optional(),
          source: z.enum(['current', 'manifest', 'navigation']),
        }),
      )
      .max(240)
      .default([]),
  })
  .strict();
const installationObservationSchema = z
  .object({
    embedKey: z.string().trim().min(8).max(160),
    pathname: z.string().min(1).max(240).optional(),
    routes: z
      .array(
        z.object({
          pathname: z.string().min(1).max(240),
          name: z.string().trim().min(1).max(120).optional(),
          source: z.enum(['current', 'manifest', 'navigation']),
        }),
      )
      .max(240)
      .default([]),
  })
  .strict();

/**
 * A browser installation receipt intentionally uses a CORS-safelisted content type. The SDK
 * must work on a merchant's domain before that domain is allowlisted, so an application/json
 * request would be stopped by a preflight against the dashboard-only API CORS policy. Fastify
 * gives text/plain requests to us as a string; the payload is still strictly parsed below.
 */
const parseInstallationObservation = (body: unknown) => {
  if (typeof body !== 'string') return installationObservationSchema.parse(body);
  return installationObservationSchema.parse(JSON.parse(body));
};

/**
 * Resolve the caller's origin from the request headers.
 *
 * `Origin` is set by the browser on cross-origin requests and cannot be forged by page
 * JavaScript. `Referer` is a fallback for the small number of clients that omit `Origin`.
 */
const originOf = (request: FastifyRequest): string | undefined => {
  const origin = request.headers.origin;
  if (typeof origin === 'string' && origin !== 'null') return normalizeOrigin(origin);

  const referer = request.headers.referer;
  if (typeof referer === 'string') return normalizeOrigin(referer);

  return undefined;
};

export const widgetRoutes: FastifyPluginAsync = async (app) => {
  /**
   * The public SDK reports that it is present before a merchant has completed server setup.
   * This is deliberately observation-only: a public embed key cannot add an allowlisted origin,
   * enable a surface, or mint a session. It gives the dashboard immediate, truthful feedback
   * instead of an empty screen while the server-only API key has not been used yet.
   */
  app.post(
    '/installations/observe',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = parseInstallationObservation(request.body);
      const origin = originOf(request);
      if (origin === undefined) {
        // Do not reveal whether an embed key exists to a caller without browser origin evidence.
        reply.status(204);
        return;
      }
      const [agent] = await getDb()
        .select({ id: agents.id, organizationId: agents.organizationId, status: agents.status })
        .from(agents)
        .where(eq(agents.embedKey, input.embedKey))
        .limit(1);
      if (!agent || agent.status === AgentStatus.ARCHIVED) {
        reply.status(204);
        return;
      }

      const pathname =
        input.pathname?.startsWith('/') && !input.pathname.includes('..')
          ? input.pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/'
          : '/';
      const routeInventory = input.routes
        .filter((route) => route.pathname.startsWith('/') && !route.pathname.includes('..'))
        .map((route) => ({
          pathname: route.pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/',
          ...(route.name ? { name: route.name } : {}),
          source: route.source,
        }));
      await getDb()
        .insert(auditLogs)
        .values({
          organizationId: agent.organizationId,
          actorId: null,
          action: 'agent.installation_observed',
          resourceType: 'agent',
          resourceId: agent.id,
          metadata: {
            platform: 'web',
            origin,
            pathname,
            sdk: 'embed-v2',
            routeInventory,
            claimedWithServerKey: false,
          },
          ipAddress: request.ip,
        });
      reply.status(204);
    },
  );

  /**
   * A merchant backend uses its server-only API key to claim the exact origin on which the SDK
   * is running. This is the automatic replacement for asking a person to type an allowlist.
   * The public embed key can never call this endpoint.
   */
  app.post(
    '/installations/claim',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const header = request.headers.authorization;
      const secret = typeof header === 'string' ? IDENTITY_BEARER.exec(header)?.[1] : undefined;
      if (!secret?.startsWith('sk_'))
        throw unauthenticated('Invalid or expired Web Agent API key.');

      const input = installationClaimSchema.parse(request.body);
      const origin = normalizeOrigin(input.origin);
      if (!origin) throw unauthenticated('Invalid or expired Web Agent API key.');
      const now = new Date();
      const [key] = await getDb()
        .update(apiKeys)
        .set({ lastUsedAt: now, updatedAt: now })
        .where(
          and(
            eq(apiKeys.keyHash, hashApiKey(secret)),
            isNull(apiKeys.revokedAt),
            or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
            isNotNull(apiKeys.agentId),
            or(
              sql`${WEB_AGENT_INSTALL_SCOPE} = any(${apiKeys.scopes})`,
              // Keys created before automatic setup remain usable and can be rotated normally.
              sql`${WEB_AGENT_IDENTITY_SCOPE} = any(${apiKeys.scopes})`,
            ),
          ),
        )
        .returning({
          id: apiKeys.id,
          organizationId: apiKeys.organizationId,
          agentId: apiKeys.agentId,
        });
      if (!key?.agentId) throw unauthenticated('Invalid or expired Web Agent API key.');

      const result = await getDb().transaction(async (tx) => {
        const [agent] = await tx
          .select({
            id: agents.id,
            status: agents.status,
            organizationId: agents.organizationId,
            allowedOrigins: agents.allowedOrigins,
            appearance: agents.appearance,
          })
          .from(agents)
          .where(and(eq(agents.id, key.agentId!), eq(agents.organizationId, key.organizationId)))
          .limit(1);
        if (!agent || agent.status === AgentStatus.ARCHIVED) {
          throw unauthenticated('Invalid or expired Web Agent API key.');
        }

        const currentPolicy = webDeploymentPolicyFromAppearance(
          agent.appearance,
          agent.allowedOrigins,
        );
        const existingSurface = currentPolicy.surfaces.find((surface) => surface.origin === origin);
        const hostname = new URL(origin).hostname;
        const policy = existingSurface
          ? currentPolicy
          : {
              ...currentPolicy,
              surfaces: [
                ...currentPolicy.surfaces,
                {
                  id: `observed_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
                  name: hostname,
                  kind: 'observed' as const,
                  origin,
                  pathPrefixes: ['/'],
                  excludedPaths: [],
                  excludedPathPrefixes: [],
                  identity: 'anonymous' as const,
                  // A server claim proves ownership; it does not publish an agent. The
                  // merchant must make the final enable decision after reviewing the detected
                  // surface, and the agent lifecycle remains the runtime authority.
                  enabled: false,
                },
              ],
            };
        const allowedOrigins = Array.from(new Set([...agent.allowedOrigins, origin]));
        if (!existingSurface || !agent.allowedOrigins.includes(origin)) {
          await tx
            .update(agents)
            .set({
              allowedOrigins,
              appearance: {
                ...(agent.appearance as object),
                webDeployment: policy,
              },
              updatedAt: now,
            })
            .where(and(eq(agents.id, agent.id), eq(agents.organizationId, agent.organizationId)));
        }

        const sanitizedRoutes = input.routes
          .filter((route) => route.pathname.startsWith('/') && !route.pathname.includes('..'))
          .map((route) => ({
            pathname: route.pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/',
            ...(route.name ? { name: route.name } : {}),
            source: route.source,
          }));
        const pathname =
          input.pathname?.startsWith('/') && !input.pathname.includes('..')
            ? input.pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/'
            : '/';
        await tx.insert(auditLogs).values({
          organizationId: agent.organizationId,
          actorId: null,
          action: 'agent.installation_verified',
          resourceType: 'agent',
          resourceId: agent.id,
          metadata: {
            platform: 'web',
            origin,
            pathname,
            surfaceId: existingSurface?.id ?? policy.surfaces.at(-1)?.id,
            surfaceName: existingSurface?.name ?? hostname,
            sdk: 'embed-v2',
            routeInventory: sanitizedRoutes,
            claimedWithServerKey: true,
          },
          ipAddress: request.ip,
        });
        return {
          claimed: !existingSurface,
          enabled: existingSurface?.enabled ?? policy.surfaces.at(-1)?.enabled ?? false,
        };
      });

      reply.header('Cache-Control', 'no-store').status(result.claimed ? 201 : 200);
      return { ok: true, origin, ...result };
    },
  );

  /**
   * Server-to-server identity exchange. The long-lived key stays on the merchant backend;
   * the browser receives only a five-minute token bound to this agent, tenant and origin.
   */
  app.post(
    '/identity',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const header = request.headers.authorization;
      const secret = typeof header === 'string' ? IDENTITY_BEARER.exec(header)?.[1] : undefined;
      if (!secret?.startsWith('sk_')) {
        throw unauthenticated('Invalid or expired Web Agent identity key.');
      }

      const input = identityRequestSchema.parse(request.body);
      const origin = normalizeOrigin(input.origin);
      if (!origin) throw unauthenticated('Invalid or expired Web Agent identity key.');

      const now = new Date();
      const [key] = await getDb()
        .update(apiKeys)
        .set({ lastUsedAt: now, updatedAt: now })
        .where(
          and(
            eq(apiKeys.keyHash, hashApiKey(secret)),
            isNull(apiKeys.revokedAt),
            or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
            isNotNull(apiKeys.agentId),
            sql`${WEB_AGENT_IDENTITY_SCOPE} = any(${apiKeys.scopes})`,
          ),
        )
        .returning({
          id: apiKeys.id,
          organizationId: apiKeys.organizationId,
          agentId: apiKeys.agentId,
        });
      if (!key?.agentId) throw unauthenticated('Invalid or expired Web Agent identity key.');

      const [agent] = await getDb()
        .select({
          id: agents.id,
          status: agents.status,
          organizationId: agents.organizationId,
          allowedOrigins: agents.allowedOrigins,
        })
        .from(agents)
        .where(and(eq(agents.id, key.agentId), eq(agents.organizationId, key.organizationId)))
        .limit(1);
      const allowed = (agent?.allowedOrigins ?? [])
        .map(normalizeOrigin)
        .filter((value): value is string => value !== undefined);
      if (!agent || agent.status === AgentStatus.ARCHIVED || !allowed.includes(origin)) {
        throw unauthenticated('Invalid or expired Web Agent identity key.');
      }

      const identity = await mintWebAgentIdentity({
        organizationId: agent.organizationId,
        agentId: agent.id,
        origin,
        externalUserId: input.userId,
      });
      await getDb()
        .insert(auditLogs)
        .values({
          organizationId: agent.organizationId,
          actorId: null,
          action: 'web_agent.identity_token_minted',
          resourceType: 'agent',
          resourceId: agent.id,
          metadata: {
            keyId: key.id,
            origin,
            userFingerprint: identity.userFingerprint,
            expiresIn: identity.expiresIn,
          },
          ipAddress: request.ip,
        });

      reply.header('Cache-Control', 'no-store').status(201);
      return { token: identity.token, expiresIn: identity.expiresIn };
    },
  );

  // Widget routes are reachable from any website, so they get their own, tighter budget
  // rather than inheriting the dashboard's.
  await app.register(async (scope) => {
    await scope.register(import('@fastify/rate-limit'), {
      max: 30,
      timeWindow: '1 minute',
      ...(isProduction ? { store: RedisRateLimitStore, cache: 0, skipOnError: false } : {}),
      keyGenerator: (request) => `${request.ip}:${originOf(request) ?? 'unknown'}`,
    });

    /**
     * Exchange a public embed key for a session.
     *
     * Returns the agent's public presentation config — never its instructions, knowledge
     * base ID, or anything else the merchant would not want on their public pages.
     */
    scope.post('/session', async (request, reply) => {
      const input = createWidgetSessionSchema.parse(request.body);
      const origin = originOf(request);

      if (origin === undefined) {
        throw new AppError(ErrorCode.ORIGIN_NOT_ALLOWED, 'Requests must include an Origin header.');
      }

      const [agent] = await getDb()
        .select()
        .from(agents)
        .where(eq(agents.embedKey, input.embedKey))
        .limit(1);

      // Same error for an unknown key and a disallowed origin — distinguishing them would
      // let someone probe which embed keys exist.
      const denied = (): never => {
        request.log.info({ origin, embedKey: input.embedKey }, 'Widget session denied');
        throw new AppError(
          ErrorCode.ORIGIN_NOT_ALLOWED,
          'This widget is not authorised for this website.',
        );
      };

      if (agent === undefined) denied();

      const allowed = agent!.allowedOrigins
        .map(normalizeOrigin)
        .filter((value): value is string => value !== undefined);

      if (!allowed.includes(origin)) denied();

      // This is installation evidence, not a cosmetic dashboard toggle. Reaching this point
      // proves that the real SDK loaded with the correct embed key from an approved origin.
      const installationProofs = await getDb()
        .select({ metadata: auditLogs.metadata })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.organizationId, agent!.organizationId),
            eq(auditLogs.resourceId, agent!.id),
            eq(auditLogs.resourceType, 'agent'),
            eq(auditLogs.action, 'agent.installation_verified'),
          ),
        );
      const originAlreadyVerified = installationProofs.some((proof) => {
        const metadata = proof.metadata as { platform?: string; origin?: string } | null;
        return metadata?.platform === 'web' && metadata.origin === origin;
      });
      if (!originAlreadyVerified) {
        await getDb()
          .insert(auditLogs)
          .values({
            organizationId: agent!.organizationId,
            actorId: null,
            action: 'agent.installation_verified',
            resourceType: 'agent',
            resourceId: agent!.id,
            metadata: { platform: 'web', origin },
            ipAddress: request.ip,
          });
      }

      if (agent!.status !== AgentStatus.ACTIVE) {
        throw new AppError(
          ErrorCode.AGENT_NOT_PUBLISHED,
          'This assistant is not available right now.',
        );
      }
      if (!agent!.executionLeaseId) {
        throw new AppError(
          ErrorCode.AGENT_NOT_PUBLISHED,
          'This assistant is not available right now.',
        );
      }
      if (
        !agent!.executionLeaseExpiresAt ||
        agent!.executionLeaseExpiresAt.getTime() < Date.now() + 5 * 60 * 1_000
      ) {
        await getDb()
          .update(agents)
          .set({
            executionLeaseExpiresAt: new Date(Date.now() + 20 * 60 * 1_000),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(agents.organizationId, agent!.organizationId),
              eq(agents.id, agent!.id),
              eq(agents.status, AgentStatus.ACTIVE),
              eq(agents.executionLeaseId, agent!.executionLeaseId),
              eq(agents.desiredStateRevision, agent!.desiredStateRevision),
            ),
          );
      }

      const language = agent!.language as AgentLanguageConfig;
      const persona = agent!.persona as AgentPersona;
      const appearance = agent!.appearance as AgentAppearance;

      const bilingual = findBilingualVoice(language.languages);

      // Scoped to this agent, this organisation, this origin and this channel. The origin is
      // the one from the header, which the browser set — not one the caller chose.
      const session = await mintWidgetToken({
        agentId: agent!.id as AgentId,
        organizationId: agent!.organizationId as OrganizationId,
        origin,
        channel: input.channel,
        configurationRevision: agent!.desiredStateRevision,
        executionLeaseId: agent!.executionLeaseId,
      });

      reply.status(201);
      return {
        agent: {
          displayName: persona.displayName,
          greeting: persona.greeting,
          appearance,
          voiceEnabled:
            agent!.voiceEnabled &&
            language.languages.some((code) => resolveVoice(code) !== undefined),
          languages: language.languages,
          primaryLanguage: language.primaryLanguage,
          // Tells the widget it can accept mixed-language speech without switching UI
          // language mid-conversation.
          codeSwitching: language.codeSwitching && bilingual !== undefined,
        },
        session: {
          channel: input.channel,
          token: session.token,
          expiresIn: session.expiresIn,
        },
      };
    });

    /**
     * The speech configuration for a session.
     *
     * Derived server-side rather than trusted from the client: the AWS constraints
     * (one dialect per language, PCM for multi-language identification) are enforced in
     * `buildTranscribeConfig`, and a client that got them wrong would fail opaquely.
     */
    scope.get('/session/:embedKey/speech-config', async (request) => {
      const { embedKey } = request.params as { embedKey: string };
      const origin = originOf(request);

      const [agent] = await getDb()
        .select({
          language: agents.language,
          allowedOrigins: agents.allowedOrigins,
          voiceEnabled: agents.voiceEnabled,
        })
        .from(agents)
        .where(eq(agents.embedKey, embedKey))
        .limit(1);

      const allowed = (agent?.allowedOrigins ?? [])
        .map(normalizeOrigin)
        .filter((value): value is string => value !== undefined);

      if (agent === undefined || origin === undefined || !allowed.includes(origin)) {
        throw new AppError(
          ErrorCode.ORIGIN_NOT_ALLOWED,
          'This widget is not authorised for this website.',
        );
      }

      const language = agent.language as AgentLanguageConfig;

      return {
        transcribe: buildTranscribeConfig(
          language.languages,
          language.primaryLanguage,
          language.codeSwitching,
        ),
        voices: language.languages.map((code) => ({
          language: code,
          ...(resolveVoice(code, {
            preferredVoiceId: language.voiceOverrides?.[code],
            ceiling: language.voiceTier,
          }) ?? { speakable: false }),
        })),
      };
    });
  });
};
