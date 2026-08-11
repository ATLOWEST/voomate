/**
 * Agent CRUD.
 *
 * Every query here goes through `tenantScope`. Read `packages/db/README.md` before adding
 * one that doesn't — there is no legitimate case.
 */
import {
  AgentStatus,
  OrgRole,
  createAgentSchema,
  notFound,
  updateAgentSchema,
  uuidSchema,
  type AgentAppearance,
  type AgentLanguageConfig,
  type AgentPersona,
} from '@voomate/core';
import { agents, knowledgeChunks, tenantScope } from '@voomate/db';
import { DEFAULT_LANGUAGE_CODES, resolveVoice, validateLanguageSet } from '@voomate/i18n';
import { and, count, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateEmbedKey } from '../../lib/keys.js';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';

const paramsSchema = z.object({ id: uuidSchema });

const DEFAULT_LANGUAGE: AgentLanguageConfig = {
  languages: DEFAULT_LANGUAGE_CODES,
  primaryLanguage: DEFAULT_LANGUAGE_CODES[0],
  codeSwitching: true,
  voiceTier: 'generative',
};

const DEFAULT_PERSONA: AgentPersona = {
  displayName: 'Assistant',
  tone: 'friendly',
  // Deliberately admits ignorance. An agent that invents an answer about a merchant's
  // refund policy is worse than one that says it doesn't know.
  fallbackMessage: "I don't have that information yet — let me connect you with the team.",
};

const DEFAULT_APPEARANCE: AgentAppearance = {
  primaryColor: '#4F46E5',
  position: 'bottom-right',
  theme: 'auto',
};

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const rows = await getDb()
      .select()
      .from(agents)
      .where(tenantScope(agents, tenant.organizationId))
      .orderBy(desc(agents.createdAt));

    return { agents: rows };
  });

  app.get('/:id', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);

    const [agent] = await getDb()
      .select()
      .from(agents)
      .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
      .limit(1);

    if (agent === undefined) throw notFound('Agent', id);
    return { agent };
  });

  app.post('/', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, async (request, reply) => {
    const tenant = tenantOf(request);
    const input = createAgentSchema.parse(request.body);

    const language = { ...DEFAULT_LANGUAGE, ...input.language };

    // Re-validated here even though the zod contract already checked it: defaults merged
    // above could in principle produce a set the contract never saw.
    const validation = validateLanguageSet(language.languages);
    if (!validation.valid) {
      return reply.status(400).send({
        error: {
          code: 'invalid_language_set',
          message: validation.problems.map((p) => p.message).join(' '),
        },
      });
    }

    const [agent] = await getDb()
      .insert(agents)
      .values({
        organizationId: tenant.organizationId,
        name: input.name,
        websiteUrl: input.websiteUrl,
        status: AgentStatus.DRAFT,
        language,
        persona: { ...DEFAULT_PERSONA, ...input.persona },
        appearance: { ...DEFAULT_APPEARANCE, ...input.appearance },
        // The agent's own site is allowlisted by default — it's the one origin the
        // merchant certainly wants, and requiring them to add it is pure friction.
        allowedOrigins: [new URL(input.websiteUrl).origin],
        embedKey: generateEmbedKey(),
      })
      .returning();

    reply.status(201);
    return { agent };
  });

  app.patch('/:id', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);
    const input = updateAgentSchema.parse(request.body);

    const [agent] = await getDb()
      .update(agents)
      .set({ ...input, updatedAt: new Date() })
      .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
      .returning();

    if (agent === undefined) throw notFound('Agent', id);
    return { agent };
  });

  /**
   * Publish. Gated on the agent being genuinely ready — publishing an agent with no
   * knowledge base produces an agent that confidently knows nothing, which is worse for the
   * merchant than a clear error here.
   */
  app.post(
    '/:id/publish',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { id } = paramsSchema.parse(request.params);
      const db = getDb();

      const [existing] = await db
        .select()
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);

      if (existing === undefined) throw notFound('Agent', id);

      // Readiness is "can this agent actually retrieve something", so ask the retrieval
      // corpus directly rather than trusting a status column. A source can be marked ready
      // while producing zero usable chunks — an empty page, a JS-only site, everything
      // stripped as boilerplate — and publishing that ships an agent that knows nothing.
      const [indexed] = await db
        .select({ chunks: count() })
        .from(knowledgeChunks)
        .where(
          and(tenantScope(knowledgeChunks, tenant.organizationId), eq(knowledgeChunks.agentId, id)),
        );

      // A count aggregate always yields a row, but treating a missing one as "not ready"
      // keeps the failure on the safe side of the publish gate rather than asserting.
      if (indexed === undefined || indexed.chunks === 0) {
        return reply.status(422).send({
          error: {
            code: 'knowledge_not_indexed',
            message: 'Add and index at least one knowledge source before publishing.',
          },
        });
      }

      const [agent] = await db
        .update(agents)
        .set({
          status: AgentStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .returning();

      return { agent };
    },
  );

  /**
   * The voice configuration the agent will actually use, per language.
   *
   * Powers the "here's what your visitors will hear" panel — including the honest
   * `degraded` flag when Polly has no Generative voice for a chosen language.
   */
  app.get(
    '/:id/voice-preview',
    { preHandler: app.requireTenant(OrgRole.VIEWER) },
    async (request) => {
      const tenant = tenantOf(request);
      const { id } = paramsSchema.parse(request.params);

      const [agent] = await getDb()
        .select()
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);

      if (agent === undefined) throw notFound('Agent', id);

      const language = agent.language as AgentLanguageConfig;
      const voices = language.languages.map((code) => {
        const resolved = resolveVoice(code, {
          preferredVoiceId: language.voiceOverrides?.[code],
          ceiling: language.voiceTier,
        });
        return { language: code, ...(resolved ?? { speakable: false }) };
      });

      return { voices };
    },
  );

  app.delete('/:id', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request, reply) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);

    const [deleted] = await getDb()
      .delete(agents)
      .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
      .returning({ id: agents.id });

    if (deleted === undefined) throw notFound('Agent', id);

    // Chunks, documents and sources go with the agent via ON DELETE CASCADE — vectors are
    // rows now, so there is no external index to keep in step.
    // TODO(phase-2): the agent's S3 crawl-archive prefix is still ours to delete; object
    // storage has no foreign key, so the objects outlive the row until we sweep them.
    reply.status(204);
  });
};
