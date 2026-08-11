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
import {
  AgentStatus,
  AppError,
  ErrorCode,
  createWidgetSessionSchema,
  type AgentAppearance,
  type AgentId,
  type AgentLanguageConfig,
  type AgentPersona,
  type OrganizationId,
} from '@voomate/core';
import { agents } from '@voomate/db';
import { buildTranscribeConfig, findBilingualVoice, resolveVoice } from '@voomate/i18n';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { getDb } from '../../lib/db.js';
import { normalizeOrigin } from '../../lib/keys.js';
import { mintWidgetToken } from './token.js';

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
  // Widget routes are reachable from any website, so they get their own, tighter budget
  // rather than inheriting the dashboard's.
  await app.register(async (scope) => {
    await scope.register(import('@fastify/rate-limit'), {
      max: 30,
      timeWindow: '1 minute',
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

      if (agent!.status !== AgentStatus.PUBLISHED) {
        throw new AppError(
          ErrorCode.AGENT_NOT_PUBLISHED,
          'This assistant is not available right now.',
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
