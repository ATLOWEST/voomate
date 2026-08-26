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
  selectAgentDeploymentSchema,
  updateAgentSchema,
  uuidSchema,
  type AgentAppearance,
  type AgentLanguageConfig,
  type AgentPersona,
  type TenantContext,
} from '@voomate/core';
import { agents, auditLogs, knowledgeChunks, tenantScope } from '@voomate/db';
import { DEFAULT_LANGUAGE_CODES, resolveVoice, validateLanguageSet } from '@voomate/i18n';
import { load } from 'cheerio';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { generateEmbedKey } from '../../lib/keys.js';
import { getDb } from '../../lib/db.js';
import { FetchError, fetchPage } from '../../lib/crawl/fetch.js';
import { tenantOf } from '../../plugins/auth.js';
import { transitionAgentLifecycle } from './lifecycle.js';

const paramsSchema = z.object({ id: uuidSchema });

type DeploymentAuditMetadata = {
  platform?: 'website' | 'web_app' | 'ios' | 'android' | 'web';
  origin?: string;
};

type SetupAuditMetadata = DeploymentAuditMetadata & {
  code?: string;
  message?: string;
  checkedUrl?: string;
  previewEmbeddable?: boolean;
  previewReason?: string | null;
};

const SETUP_ACTIONS = [
  'agent.installation_verified',
  'agent.playground_test_succeeded',
  'agent.sdk_diagnosed',
] as const;

type SetupStepId = 'install' | 'knowledge' | 'test' | 'activate';

async function getWebAgentSetup(organizationId: TenantContext['organizationId'], agentId: string) {
  const db = getDb();
  const [agent] = await db
    .select({
      id: agents.id,
      catalogType: agents.catalogType,
      status: agents.status,
      websiteUrl: agents.websiteUrl,
      allowedOrigins: agents.allowedOrigins,
    })
    .from(agents)
    .where(and(tenantScope(agents, organizationId), eq(agents.id, agentId)))
    .limit(1);
  if (!agent) throw notFound('Agent', agentId);

  const [[knowledge], evidence] = await Promise.all([
    db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(and(tenantScope(knowledgeChunks, organizationId), eq(knowledgeChunks.agentId, agentId))),
    db
      .select({ action: auditLogs.action, metadata: auditLogs.metadata, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(
        and(
          tenantScope(auditLogs, organizationId),
          eq(auditLogs.resourceType, 'agent'),
          eq(auditLogs.resourceId, agentId),
          inArray(auditLogs.action, [...SETUP_ACTIONS]),
        ),
      )
      .orderBy(desc(auditLogs.createdAt)),
  ]);

  const proof = evidence.find((record) => {
    const metadata = record.metadata as SetupAuditMetadata | null;
    return (
      record.action === 'agent.installation_verified' &&
      metadata?.platform === 'web' &&
      typeof metadata.origin === 'string' &&
      agent.allowedOrigins.includes(metadata.origin)
    );
  });
  const test = evidence.find((record) => record.action === 'agent.playground_test_succeeded');
  const diagnostic = evidence.find((record) => record.action === 'agent.sdk_diagnosed');
  const diagnosticMetadata = diagnostic?.metadata as SetupAuditMetadata | null | undefined;
  const ready: Record<SetupStepId, boolean> = {
    install: Boolean(proof),
    knowledge: Number(knowledge?.total ?? 0) > 0,
    test: Boolean(test),
    activate: agent.status === AgentStatus.ACTIVE,
  };
  const order: Array<{ id: SetupStepId; label: string; detail: string; href: string }> = [
    {
      id: 'install',
      label: ready.install ? 'Web SDK verified' : 'Install the Web SDK',
      detail: ready.install
        ? `Verified on ${(proof?.metadata as SetupAuditMetadata).origin ?? 'an approved domain'}`
        : agent.allowedOrigins.length
          ? 'Paste the snippet on an approved domain, then open that page once.'
          : 'Add your site domain, paste the snippet, then open that page once.',
      href: `/agents/${agentId}/install`,
    },
    {
      id: 'knowledge',
      label: ready.knowledge ? 'Knowledge ready' : 'Add what the agent should know',
      detail: ready.knowledge
        ? `${String(knowledge?.total ?? 0)} indexed knowledge items are ready.`
        : 'Add your website, a document, or approved answers.',
      href: `/agents/${agentId}/knowledge`,
    },
    {
      id: 'test',
      label: ready.test ? 'Test completed' : 'Try it with a customer question',
      detail: ready.test
        ? 'A real dashboard test has been recorded.'
        : 'Run one test before you turn the agent on.',
      href: `/agents/${agentId}/playground`,
    },
    {
      id: 'activate',
      label: ready.activate ? 'Agent is on' : 'Turn on the agent',
      detail: ready.activate
        ? 'The signed runtime is active.'
        : 'Turn it on only after the other checks are complete.',
      href: `/agents/${agentId}/configuration`,
    },
  ];
  const current = order.find((step) => !ready[step.id]) ?? order[order.length - 1]!;
  return {
    platform: 'web' as const,
    completed: order.filter((step) => ready[step.id]).length,
    total: order.length,
    percentage: Math.round((order.filter((step) => ready[step.id]).length / order.length) * 100),
    currentStep: current.id,
    nextAction: { label: ready.activate ? 'Review agent' : `Continue: ${current.label}`, href: current.href },
    steps: order.map((step) => ({ ...step, complete: ready[step.id], current: step.id === current.id })),
    sdk: {
      verified: ready.install,
      verifiedOrigin: ready.install ? ((proof?.metadata as SetupAuditMetadata).origin ?? null) : null,
      verifiedAt: proof?.createdAt ?? null,
      diagnostic: diagnosticMetadata
        ? {
            code: diagnosticMetadata.code ?? 'checked',
            message: diagnosticMetadata.message ?? 'The site was checked.',
            checkedUrl: diagnosticMetadata.checkedUrl ?? null,
            previewEmbeddable: diagnosticMetadata.previewEmbeddable ?? false,
            previewReason: diagnosticMetadata.previewReason ?? null,
            checkedAt: diagnostic?.createdAt ?? null,
          }
        : null,
    },
  };
}

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

  app.get('/:id/setup', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);
    return { setup: await getWebAgentSetup(tenant.organizationId, id) };
  });

  app.post(
    '/:id/setup/diagnose',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request) => {
      const tenant = tenantOf(request);
      const { id } = paramsSchema.parse(request.params);
      const [agent] = await getDb()
        .select({ id: agents.id, websiteUrl: agents.websiteUrl, allowedOrigins: agents.allowedOrigins })
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);
      if (!agent) throw notFound('Agent', id);

      const startUrl = agent.websiteUrl || agent.allowedOrigins[0];
      if (!startUrl) {
        throw conflict('Add your website domain before checking the SDK installation.');
      }

      let metadata: SetupAuditMetadata;
      try {
        const page = await fetchPage(startUrl, { timeoutMs: 10_000 });
        const document = load(page.body);
        const scripts = document('script[src]')
          .toArray()
          .map((node) => ({
            src: document(node).attr('src') ?? '',
            key: document(node).attr('data-agent') ?? '',
          }));
        const expected = scripts.filter((script) => script.key.length > 0 && /\/embed\.js(?:$|[?#])/i.test(script.src));
        const expectedKey = await getDb()
          .select({ embedKey: agents.embedKey })
          .from(agents)
          .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
          .limit(1);
        const matching = expected.filter((script) => script.key === expectedKey[0]?.embedKey);
        const xFrame = page.xFrameOptions?.toLowerCase() ?? '';
        const csp = page.contentSecurityPolicy?.toLowerCase() ?? '';
        const previewEmbeddable = !xFrame.includes('deny') && !xFrame.includes('sameorigin') && !csp.includes('frame-ancestors');

        if (matching.length > 1) {
          metadata = {
            code: 'duplicate_sdk',
            message: 'More than one Voomate snippet was found. Keep only one copy so visitors do not open duplicate sessions.',
            checkedUrl: page.url,
            previewEmbeddable,
            previewReason: previewEmbeddable ? null : 'Your site blocks embedded previews with its security headers.',
          };
        } else if (matching.length === 1) {
          metadata = {
            code: 'snippet_found',
            message: 'The Voomate snippet and this agent key were found. Open the page in a browser to finish verification.',
            checkedUrl: page.url,
            previewEmbeddable,
            previewReason: previewEmbeddable ? null : 'Your site blocks embedded previews with its security headers.',
          };
        } else if (expected.length > 0) {
          metadata = {
            code: 'wrong_agent_key',
            message: 'A Voomate snippet was found, but it belongs to a different agent. Copy the snippet from this page again.',
            checkedUrl: page.url,
            previewEmbeddable,
            previewReason: previewEmbeddable ? null : 'Your site blocks embedded previews with its security headers.',
          };
        } else {
          metadata = {
            code: 'sdk_not_found',
            message: 'No Voomate snippet was found on this page. Paste the snippet before the closing body tag, publish the page, then check again.',
            checkedUrl: page.url,
            previewEmbeddable,
            previewReason: previewEmbeddable ? null : 'Your site blocks embedded previews with its security headers.',
          };
        }
      } catch (error) {
        metadata = {
          code: 'site_unreachable',
          message:
            error instanceof FetchError
              ? `We could not check the site: ${error.message}`
              : 'We could not check this site right now. Confirm the URL is public, then try again.',
          checkedUrl: startUrl,
          previewEmbeddable: false,
          previewReason: 'The site could not be loaded safely from Voomate.',
        };
      }

      await getDb().insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'agent.sdk_diagnosed',
        resourceType: 'agent',
        resourceId: id,
        metadata,
      });
      return { diagnostic: metadata, setup: await getWebAgentSetup(tenant.organizationId, id) };
    },
  );

  app.get(
    '/:id/deployment',
    { preHandler: app.requireTenant(OrgRole.VIEWER) },
    async (request) => {
      const tenant = tenantOf(request);
      const { id } = paramsSchema.parse(request.params);

      const [agent] = await getDb()
        .select({ id: agents.id, allowedOrigins: agents.allowedOrigins })
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);
      if (!agent) throw notFound('Agent', id);

      const verified = await getDb()
        .select({ metadata: auditLogs.metadata, createdAt: auditLogs.createdAt })
          .from(auditLogs)
          .where(
            and(
              tenantScope(auditLogs, tenant.organizationId),
              eq(auditLogs.resourceId, id),
              eq(auditLogs.resourceType, 'agent'),
              eq(auditLogs.action, 'agent.installation_verified'),
            ),
          )
          .orderBy(desc(auditLogs.createdAt));

      const currentProof = verified.find((record) => {
        const proof = record.metadata as DeploymentAuditMetadata | undefined;
        return (
          proof?.platform === 'web' &&
          typeof proof.origin === 'string' &&
          agent.allowedOrigins.includes(proof.origin)
        );
      });
      const proof = currentProof?.metadata as DeploymentAuditMetadata | undefined;
      const proofIsCurrent = currentProof !== undefined;

      return {
        deployment: {
          // Website and browser Web App share the same signed Web SDK. There is one real
          // deployment path; historical target records are read only for audit compatibility.
          platform: 'web',
          supported: true,
          verified: proofIsCurrent,
          verifiedOrigin: proofIsCurrent ? (proof?.origin ?? null) : null,
          verifiedAt: proofIsCurrent ? currentProof.createdAt : null,
        },
      };
    },
  );

  app.post(
    '/:id/deployment',
    { preHandler: app.requireTenant(OrgRole.DEVELOPER) },
    async (request) => {
      const tenant = tenantOf(request);
      const { id } = paramsSchema.parse(request.params);
      const input = selectAgentDeploymentSchema.parse(request.body);

      const [agent] = await getDb()
        .select({ id: agents.id, catalogType: agents.catalogType })
        .from(agents)
        .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, id)))
        .limit(1);
      if (!agent) throw notFound('Agent', id);
      if (agent.catalogType !== 'web') {
        throw conflict('Deployment targets are currently available only for the Web Agent.');
      }
      if (input.platform === 'ios' || input.platform === 'android') {
        throw conflict('Native SDKs are not released yet. The Web Agent uses one Web SDK for websites and browser apps.');
      }

      await getDb().insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'agent.deployment_target_selected',
        resourceType: 'agent',
        resourceId: id,
        metadata: { platform: input.platform },
      });

      return {
        deployment: {
          platform: 'web',
          supported: true,
          verified: false,
          verifiedOrigin: null,
          verifiedAt: null,
        },
      };
    },
  );

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
