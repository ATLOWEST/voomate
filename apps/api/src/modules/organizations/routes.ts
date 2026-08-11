import { OrgRole, createOrganizationSchema, inviteMemberSchema, notFound } from '@voomate/core';
import { organizationMembers, organizations, users } from '@voomate/db';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../../lib/db.js';
import { tenantOf } from '../../plugins/auth.js';

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  /** Organizations the caller belongs to — drives the dashboard's org switcher. */
  app.get('/', { preHandler: app.requireAuth }, async (request) => {
    const rows = await getDb()
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, request.userId!));

    return { organizations: rows };
  });

  /**
   * Create an organization. The creator becomes its owner in the same transaction — an
   * organization that briefly exists with no owner is unreachable and unrecoverable.
   */
  app.post('/', { preHandler: app.requireAuth }, async (request, reply) => {
    const input = createOrganizationSchema.parse(request.body);
    const userId = request.userId!;

    const organization = await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(organizations)
        .values({
          name: input.name,
          // Suffixed for uniqueness — two merchants can legitimately share a company name.
          slug: input.slug ?? `${slugify(input.name)}-${Math.random().toString(36).slice(2, 8)}`,
        })
        .returning();

      await tx.insert(organizationMembers).values({
        organizationId: created!.id,
        userId,
        role: OrgRole.OWNER,
      });

      return created!;
    });

    reply.status(201);
    return { organization };
  });

  app.get('/:id/members', { preHandler: app.requireTenant(OrgRole.VIEWER) }, async (request) => {
    const tenant = tenantOf(request);
    const members = await getDb()
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: organizationMembers.role,
        joinedAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, tenant.organizationId));

    return { members };
  });

  app.post(
    '/:id/members',
    { preHandler: app.requireTenant(OrgRole.ADMIN) },
    async (request, reply) => {
      const input = inviteMemberSchema.parse(request.body);

      // TODO(phase-1): send an invite email via Supabase Auth and create a pending
      // invitation row. Adding a membership directly only works for users who already
      // exist, which is not the common case.
      request.log.info({ email: input.email, role: input.role }, 'Member invite requested');

      reply.status(501);
      return {
        error: {
          code: 'not_implemented',
          message: 'Member invitations are wired up in Phase 1, alongside Supabase Auth.',
        },
      };
    },
  );

  app.delete(
    '/:id/members/:userId',
    { preHandler: app.requireTenant(OrgRole.ADMIN) },
    async (request, reply) => {
      const tenant = tenantOf(request);
      const { userId } = request.params as { userId: string };

      // An organization must always retain an owner, or nobody can administer or cancel it.
      const [target] = await getDb()
        .select({ role: organizationMembers.role })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, tenant.organizationId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .limit(1);

      if (target === undefined) throw notFound('Member', userId);

      if (target.role === OrgRole.OWNER) {
        return reply.status(409).send({
          error: {
            code: 'conflict',
            message: 'Transfer ownership before removing the owner.',
          },
        });
      }

      await getDb()
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, tenant.organizationId),
            eq(organizationMembers.userId, userId),
          ),
        );

      reply.status(204);
    },
  );
};
