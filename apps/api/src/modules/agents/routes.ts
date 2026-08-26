/**
 * Agent CRUD.
 *
 * Every query here goes through `tenantScope`. Read `packages/db/README.md` before adding
 * one that doesn't — there is no legitimate case.
 */
import { randomUUID } from 'node:crypto';
import {
  AGENT_CATALOG,
  AgentStatus,
  OrgRole,
  conflict,
  createAgentSchema,
  getAgentCatalogDefinition,
  isReleasedAgentType,
  notFound,
  updateAgentSchema,
  uuidSchema,
  type AgentAppearance,
  type AgentLanguageConfig,
  type AgentPersona,
} from '@voomate/core';
import { agents, auditLogs, tenantScope } from '@voomate/db';
import { DEFAULT_LANGUAGE_CODES, resolveVoice, validateLanguageSet } from '@voomate/i18n';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { generateEmbedKey } from '../../lib/keys.js';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';
import { transitionAgentLifecycle } from './lifecycle.js';

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
  app.get('/catalog', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async () => ({
    catalog: AGENT_CATALOG,
  }));

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
    if (!isReleasedAgentType(input.catalogType)) {
      const definition = getAgentCatalogDefinition(input.catalogType);
      throw conflict(
        `${definition.name} is visible in the catalog but cannot be created until its runtime, policy and evaluation packs are released.`,
      );
    }
    const catalog = getAgentCatalogDefinition(input.catalogType);

    // One capability has one durable workspace slot. Keeping this tenant-scoped avoids a
    // second Web Agent being created through a stale browser tab or a direct API request.
    const [existing] = await getDb()
      .select({ id: agents.id })
      .from(agents)
      .where(
        and(
          tenantScope(agents, tenant.organizationId),
          eq(agents.catalogType, catalog.id),
        ),
      )
      .limit(1);
    if (existing) {
      throw conflict(`${catalog.name} already exists in this workspace.`);
    }

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
        name: input.name ?? catalog.name,
        catalogType: catalog.id,
        catalogVersion: catalog.version,
        websiteUrl: input.websiteUrl ?? '',
        status: AgentStatus.DRAFT,
        language,
        persona: { ...DEFAULT_PERSONA, ...input.persona },
        appearance: { ...DEFAULT_APPEARANCE, ...input.appearance },
        // A website is optional at creation. When supplied, it is safely allowlisted; when
        // it is not, installation explicitly guides the merchant to add trusted origins.
        allowedOrigins: input.websiteUrl ? [new URL(input.websiteUrl).origin] : [],
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

    const agent = await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);
      if (!existing) throw notFound('Agent', id);

      const active = existing.status === AgentStatus.ACTIVE;
      const nextRevision = existing.desiredStateRevision + 1;
      const [updated] = await tx
        .update(agents)
        .set({
          ...input,
          ...(input.persona
            ? { persona: { ...(existing.persona as object), ...input.persona } }
            : {}),
          ...(input.appearance
            ? { appearance: { ...(existing.appearance as object), ...input.appearance } }
            : {}),
          desiredStateRevision: nextRevision,
          observedStateRevision: nextRevision,
          executionLeaseId: active ? randomUUID() : null,
          executionLeaseExpiresAt: active ? new Date(Date.now() + 20 * 60 * 1_000) : null,
          updatedAt: new Date(),
        })
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .returning();
      if (!updated) throw notFound('Agent', id);
      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'agent.configuration_updated',
        resourceType: 'agent',
        resourceId: id,
        metadata: {
          changedFields: Object.keys(input).sort(),
          desiredStateRevision: nextRevision,
          activeLeaseRotated: active,
        },
      });
      return updated;
    });

    return { agent };
  });

  const lifecycle = async (
    request: FastifyRequest,
    command: 'activate' | 'pause' | 'archive' | 'restore',
  ) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);
    return transitionAgentLifecycle({ agentId: id, command, tenant });
  };

  app.post('/:id/activate', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, (request) =>
    lifecycle(request, 'activate'),
  );
  // Compatibility path for installed dashboard/SDK clients. It uses the same governed command.
  app.post('/:id/publish', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, (request) =>
    lifecycle(request, 'activate'),
  );
  app.post('/:id/resume', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, (request) =>
    lifecycle(request, 'activate'),
  );
  app.post('/:id/pause', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, (request) =>
    lifecycle(request, 'pause'),
  );
  app.post('/:id/archive', { preHandler: app.requireTenant(OrgRole.ADMIN) }, (request) =>
    lifecycle(request, 'archive'),
  );
  app.post('/:id/restore', { preHandler: app.requireTenant(OrgRole.ADMIN) }, (request) =>
    lifecycle(request, 'restore'),
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

  app.delete('/:id', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);
    // Delete is a compatibility name for safe retirement. Physical erasure is a separate,
    // retention-governed operation; audit and configuration evidence are never cascaded here.
    return transitionAgentLifecycle({ agentId: id, command: 'archive', tenant });
  });
};
