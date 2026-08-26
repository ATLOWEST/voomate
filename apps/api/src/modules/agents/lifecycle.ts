import { randomUUID } from 'node:crypto';
import {
  AgentStatus,
  conflict,
  getAgentCatalogDefinition,
  isReleasedAgentType,
  notFound,
  type AgentCatalogType,
  type AgentStatus as AgentLifecycleStatus,
  type TenantContext,
} from '@voomate/core';
import {
  agentActiveTools,
  agentConnections,
  agents,
  auditLogs,
  knowledgeChunks,
  readOnlyConnections,
  readOnlyConnectionSecrets,
  tenantScope,
} from '@voomate/db';
import { and, count, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';

export type AgentLifecycleCommand = 'activate' | 'pause' | 'archive' | 'restore';

const LEASE_TTL_MS = 20 * 60 * 1_000;

export function nextAgentLifecycleStatus(
  current: AgentLifecycleStatus,
  command: AgentLifecycleCommand,
): AgentLifecycleStatus {
  if (command === 'archive') return AgentStatus.ARCHIVED;
  if (command === 'restore') {
    if (current !== AgentStatus.ARCHIVED) throw conflict('Only an archived agent can be restored.');
    return AgentStatus.PAUSED;
  }
  if (command === 'pause') {
    if (current === AgentStatus.DRAFT) throw conflict('A draft agent cannot be paused.');
    if (current === AgentStatus.ARCHIVED)
      throw conflict('An archived agent must be restored first.');
    return AgentStatus.PAUSED;
  }
  if (current === AgentStatus.ARCHIVED) throw conflict('An archived agent must be restored first.');
  return AgentStatus.ACTIVE;
}

export async function transitionAgentLifecycle(input: {
  agentId: string;
  command: AgentLifecycleCommand;
  tenant: TenantContext;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: agents.id,
        status: agents.status,
        catalogType: agents.catalogType,
        catalogVersion: agents.catalogVersion,
        desiredStateRevision: agents.desiredStateRevision,
        executionLeaseId: agents.executionLeaseId,
        executionLeaseExpiresAt: agents.executionLeaseExpiresAt,
        publishedAt: agents.publishedAt,
        allowedOrigins: agents.allowedOrigins,
      })
      .from(agents)
      .where(and(tenantScope(agents, input.tenant.organizationId), eq(agents.id, input.agentId)))
      .limit(1);
    if (!existing) throw notFound('Agent', input.agentId);

    const nextStatus = nextAgentLifecycleStatus(existing.status, input.command);
    const catalogType = existing.catalogType as AgentCatalogType;
    const catalog = getAgentCatalogDefinition(catalogType);
    if (input.command === 'activate' && !isReleasedAgentType(catalogType)) {
      throw conflict(
        `${catalog.name} cannot be activated until its runtime, policy and evaluation packs are released.`,
      );
    }

    if (input.command === 'activate' && existing.status !== AgentStatus.ACTIVE) {
      const [indexed] = await tx
        .select({ chunks: count() })
        .from(knowledgeChunks)
        .where(
          and(
            tenantScope(knowledgeChunks, input.tenant.organizationId),
            eq(knowledgeChunks.agentId, input.agentId),
          ),
        );
      if (!indexed?.chunks) {
        throw conflict('Add and index at least one knowledge source before activating this agent.');
      }
    }

    if (input.command === 'activate' && existing.status === AgentStatus.DRAFT) {
      // A Website and a browser-based Web App both run the same signed Web SDK. Keeping a
      // separate selection here created a cosmetic step that could block a real deployment.
      // Native packages are not released, so they are deliberately not part of this lifecycle.
      if (!existing.allowedOrigins.length) {
        throw conflict('Add an approved domain before activating this agent.');
      }

      const installations = await tx
        .select({ metadata: auditLogs.metadata })
        .from(auditLogs)
        .where(
          and(
            tenantScope(auditLogs, input.tenant.organizationId),
            eq(auditLogs.resourceId, input.agentId),
            eq(auditLogs.resourceType, 'agent'),
            eq(auditLogs.action, 'agent.installation_verified'),
          ),
        )
        .orderBy(desc(auditLogs.createdAt));
      const hasCurrentProof = installations.some((installation) => {
        const proof = installation.metadata as { platform?: string; origin?: string } | undefined;
        return (
          proof?.platform === 'web' &&
          typeof proof.origin === 'string' &&
          existing.allowedOrigins.includes(proof.origin)
        );
      });
      if (!hasCurrentProof) {
        throw conflict('Install the SDK and open it once on an approved domain before activation.');
      }
    }

    const leaseExpired =
      existing.executionLeaseExpiresAt === null || existing.executionLeaseExpiresAt <= new Date();
    const stateChanged = nextStatus !== existing.status;
    const repairActiveLease = nextStatus === AgentStatus.ACTIVE && leaseExpired;
    const mutated = stateChanged || repairActiveLease;
    const nextRevision = existing.desiredStateRevision + (mutated ? 1 : 0);
    const leaseExpiresAt =
      nextStatus === AgentStatus.ACTIVE ? new Date(Date.now() + LEASE_TTL_MS) : null;
    const executionLeaseId =
      nextStatus === AgentStatus.ACTIVE
        ? stateChanged || !existing.executionLeaseId
          ? randomUUID()
          : existing.executionLeaseId
        : null;

    const [agent] = mutated
      ? await tx
          .update(agents)
          .set({
            status: nextStatus,
            desiredStateRevision: nextRevision,
            // The released Web Agent is hosted in this control plane, so persistence and runtime
            // convergence are one transaction. Edge-hosted catalog types will acknowledge this
            // field through the signed Edge protocol before their release.
            observedStateRevision: nextRevision,
            executionLeaseId,
            executionLeaseExpiresAt: leaseExpiresAt,
            publishedAt:
              nextStatus === AgentStatus.ACTIVE ? (existing.publishedAt ?? new Date()) : undefined,
            archivedAt: nextStatus === AgentStatus.ARCHIVED ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(
            and(tenantScope(agents, input.tenant.organizationId), eq(agents.id, input.agentId)),
          )
          .returning()
      : await tx
          .select()
          .from(agents)
          .where(
            and(tenantScope(agents, input.tenant.organizationId), eq(agents.id, input.agentId)),
          )
          .limit(1);

    if (nextStatus === AgentStatus.ARCHIVED && stateChanged) {
      const connections = await tx
        .select({ id: readOnlyConnections.id })
        .from(readOnlyConnections)
        .where(
          and(
            tenantScope(readOnlyConnections, input.tenant.organizationId),
            eq(readOnlyConnections.agentId, input.agentId),
          ),
        );
      if (connections.length) {
        await tx.delete(readOnlyConnectionSecrets).where(
          inArray(
            readOnlyConnectionSecrets.connectionId,
            connections.map(({ id }) => id),
          ),
        );
      }
      await Promise.all([
        tx
          .update(readOnlyConnections)
          .set({ status: 'revoked', updatedAt: new Date() })
          .where(
            and(
              tenantScope(readOnlyConnections, input.tenant.organizationId),
              eq(readOnlyConnections.agentId, input.agentId),
            ),
          ),
        tx
          .update(agentActiveTools)
          .set({ status: 'paused', updatedAt: new Date() })
          .where(
            and(
              tenantScope(agentActiveTools, input.tenant.organizationId),
              eq(agentActiveTools.agentId, input.agentId),
            ),
          ),
        tx
          .update(agentConnections)
          .set({ status: 'revoked', updatedAt: new Date() })
          .where(
            and(
              tenantScope(agentConnections, input.tenant.organizationId),
              or(
                eq(agentConnections.sourceAgentId, input.agentId),
                eq(agentConnections.targetAgentId, input.agentId),
              ),
            ),
          ),
      ]);
    }

    await tx.insert(auditLogs).values({
      organizationId: input.tenant.organizationId,
      actorId: input.tenant.userId,
      action: `agent.${input.command}`,
      resourceType: 'agent',
      resourceId: input.agentId,
      metadata: {
        catalogType,
        catalogVersion: existing.catalogVersion,
        from: existing.status,
        to: nextStatus,
        desiredStateRevision: nextRevision,
        idempotent: !mutated,
        credentialsRevoked: nextStatus === AgentStatus.ARCHIVED && stateChanged,
      },
    });

    return { agent: agent!, idempotent: !mutated };
  });
}
