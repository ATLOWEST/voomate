import { randomUUID } from 'node:crypto';
import {
  AgentStatus,
  OrgRole,
  businessOperatingProfileSchema,
  conflict,
  notFound,
  proposeBusinessProfileSchema,
  uuidSchema,
} from '@voomate/core';
import {
  agents,
  auditLogs,
  businessProfileEvidence,
  businessProfileVersions,
  tenantScope,
} from '@voomate/db';
import { and, asc, desc, eq, max, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';

const paramsSchema = z.object({ id: uuidSchema });

export const businessProfileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const db = getDb();
    const versions = await db
      .select()
      .from(businessProfileVersions)
      .where(tenantScope(businessProfileVersions, tenant.organizationId))
      .orderBy(desc(businessProfileVersions.revision));
    const evidence = await db
      .select()
      .from(businessProfileEvidence)
      .where(tenantScope(businessProfileEvidence, tenant.organizationId))
      .orderBy(asc(businessProfileEvidence.createdAt));
    return {
      approved: versions.find(({ status }) => status === 'approved') ?? null,
      versions,
      evidence,
    };
  });

  app.post('/proposals', { preHandler: app.requireTenant(OrgRole.DEVELOPER) }, async (request) => {
    const tenant = tenantOf(request);
    const input = proposeBusinessProfileSchema.parse(request.body);
    return getDb().transaction(async (tx) => {
      // One workspace can receive proposals from several ingestion workers. Serialize revision
      // allocation by tenant so the unique revision is deterministic rather than a retry race.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${tenant.organizationId}))`);
      const [current] = await tx
        .select({ revision: max(businessProfileVersions.revision) })
        .from(businessProfileVersions)
        .where(tenantScope(businessProfileVersions, tenant.organizationId));
      const revision = (current?.revision ?? 0) + 1;
      const [version] = await tx
        .insert(businessProfileVersions)
        .values({
          organizationId: tenant.organizationId,
          revision,
          status: 'proposed',
          profile: input.profile,
          changeSummary: input.changeSummary,
          createdBy: tenant.userId,
        })
        .returning();
      if (!version) throw new Error('Could not create the Business Operating Profile proposal.');
      await tx.insert(businessProfileEvidence).values(
        input.evidence.map((item) => ({
          organizationId: tenant.organizationId,
          profileVersionId: version.id,
          section: item.section,
          sourceType: item.sourceType,
          sourceReference: item.sourceReference,
          confidence: item.confidence,
          inferenceVersion: item.inferenceVersion,
          reviewState: 'proposed' as const,
          observedAt: new Date(item.observedAt),
          data: item.data,
        })),
      );
      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'business_profile.proposed',
        resourceType: 'business_profile_version',
        resourceId: version.id,
        metadata: { revision, evidenceCount: input.evidence.length },
      });
      return { version };
    });
  });

  app.post('/:id/approve', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);
    return getDb().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${tenant.organizationId}))`);
      const [candidate] = await tx
        .select()
        .from(businessProfileVersions)
        .where(
          and(
            tenantScope(businessProfileVersions, tenant.organizationId),
            eq(businessProfileVersions.id, id),
          ),
        )
        .limit(1);
      if (!candidate) throw notFound('Business Operating Profile version', id);
      businessOperatingProfileSchema.parse(candidate.profile);
      if (candidate.status === 'approved') return { version: candidate, idempotent: true };
      if (candidate.status !== 'proposed') {
        throw conflict('Only a proposed Business Operating Profile can be approved.');
      }

      const previous = await tx
        .select({ id: businessProfileVersions.id })
        .from(businessProfileVersions)
        .where(
          and(
            tenantScope(businessProfileVersions, tenant.organizationId),
            eq(businessProfileVersions.status, 'approved'),
          ),
        );
      if (previous.length) {
        await tx
          .update(businessProfileVersions)
          .set({ status: 'retired', updatedAt: new Date() })
          .where(
            and(
              tenantScope(businessProfileVersions, tenant.organizationId),
              eq(businessProfileVersions.status, 'approved'),
            ),
          );
        await tx
          .update(businessProfileEvidence)
          .set({ reviewState: 'retired', updatedAt: new Date() })
          .where(
            and(
              tenantScope(businessProfileEvidence, tenant.organizationId),
              eq(businessProfileEvidence.reviewState, 'approved'),
            ),
          );
      }

      const [version] = await tx
        .update(businessProfileVersions)
        .set({
          status: 'approved',
          approvedBy: tenant.userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            tenantScope(businessProfileVersions, tenant.organizationId),
            eq(businessProfileVersions.id, id),
          ),
        )
        .returning();
      await tx
        .update(businessProfileEvidence)
        .set({ reviewState: 'approved', updatedAt: new Date() })
        .where(
          and(
            tenantScope(businessProfileEvidence, tenant.organizationId),
            eq(businessProfileEvidence.profileVersionId, id),
          ),
        );

      const affectedAgents = await tx
        .select({
          id: agents.id,
          status: agents.status,
          desiredStateRevision: agents.desiredStateRevision,
        })
        .from(agents)
        .where(
          and(
            tenantScope(agents, tenant.organizationId),
            sql`${agents.status} <> ${AgentStatus.ARCHIVED}`,
          ),
        );
      for (const agent of affectedAgents) {
        const nextRevision = agent.desiredStateRevision + 1;
        const active = agent.status === AgentStatus.ACTIVE;
        await tx
          .update(agents)
          .set({
            businessProfileVersionId: id,
            desiredStateRevision: nextRevision,
            observedStateRevision: nextRevision,
            executionLeaseId: active ? randomUUID() : null,
            executionLeaseExpiresAt: active ? new Date(Date.now() + 20 * 60 * 1_000) : null,
            updatedAt: new Date(),
          })
          .where(and(tenantScope(agents, tenant.organizationId), eq(agents.id, agent.id)));
      }
      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'business_profile.approved',
        resourceType: 'business_profile_version',
        resourceId: id,
        metadata: {
          revision: candidate.revision,
          retiredVersionIds: previous.map(({ id: previousId }) => previousId),
          affectedAgentCount: affectedAgents.length,
        },
      });
      return { version, idempotent: false };
    });
  });

  app.post('/:id/reject', { preHandler: app.requireTenant(OrgRole.ADMIN) }, async (request) => {
    const tenant = tenantOf(request);
    const { id } = paramsSchema.parse(request.params);
    return getDb().transaction(async (tx) => {
      const [version] = await tx
        .update(businessProfileVersions)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(
          and(
            tenantScope(businessProfileVersions, tenant.organizationId),
            eq(businessProfileVersions.id, id),
            eq(businessProfileVersions.status, 'proposed'),
          ),
        )
        .returning();
      if (!version) throw conflict('Only an existing proposal can be rejected.');
      await tx
        .update(businessProfileEvidence)
        .set({ reviewState: 'rejected', updatedAt: new Date() })
        .where(
          and(
            tenantScope(businessProfileEvidence, tenant.organizationId),
            eq(businessProfileEvidence.profileVersionId, id),
          ),
        );
      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        actorId: tenant.userId,
        action: 'business_profile.rejected',
        resourceType: 'business_profile_version',
        resourceId: id,
        metadata: { revision: version.revision },
      });
      return { version };
    });
  });
};
