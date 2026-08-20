/**
 * Private Voomate control-plane routes.
 *
 * These routes are deliberately not tenant routes: they are protected by the explicit
 * `platform_administrators` allowlist, never by ownership of an arbitrary merchant workspace.
 */
import { OrgRole } from '@voomate/core';
import { agents, organizationMembers, organizations, users } from '@voomate/db';
import { and, count, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../../lib/db.js';

export const platformRoutes: FastifyPluginAsync = async (app) => {
  app.get('/merchants', { preHandler: app.requirePlatformAdmin }, async () => {
    // One row per workspace. The owner join is constrained to the owner role so an ordinary
    // member can never become the displayed account simply because they joined later.
    const rows = await getDb()
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        createdAt: organizations.createdAt,
        ownerEmail: users.email,
        activeAgentCount: count(agents.id),
      })
      .from(organizations)
      .leftJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, organizations.id),
          eq(organizationMembers.role, OrgRole.OWNER),
        ),
      )
      .leftJoin(users, eq(users.id, organizationMembers.userId))
      .leftJoin(
        agents,
        and(eq(agents.organizationId, organizations.id), eq(agents.status, 'active')),
      )
      .groupBy(
        organizations.id,
        organizations.name,
        organizations.slug,
        organizations.plan,
        organizations.createdAt,
        users.email,
      )
      .orderBy(desc(organizations.createdAt));

    return {
      merchants: rows.map((row) => ({
        ...row,
        activeAgentCount: Number(row.activeAgentCount),
      })),
    };
  });

  app.get('/agents', { preHandler: app.requirePlatformAdmin }, async () => {
    const rows = await getDb()
      .select({
        id: agents.id,
        name: agents.name,
        catalogType: agents.catalogType,
        status: agents.status,
        websiteUrl: agents.websiteUrl,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .innerJoin(organizations, eq(organizations.id, agents.organizationId))
      .orderBy(desc(agents.updatedAt));

    return { agents: rows };
  });
};
