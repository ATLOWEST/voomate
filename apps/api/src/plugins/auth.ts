/**
 * Authentication and tenant resolution.
 *
 * Two separate concerns, deliberately separate decorators:
 *
 *   `requireAuth`   — proves who you are (a valid Supabase JWT).
 *   `requireTenant` — proves which organization you're acting in, and with what role.
 *
 * Authentication alone grants nothing. Every tenant-scoped route needs both, and the
 * resulting `TenantContext` is what repositories require — see `tenantScope` in @soniq/db.
 */
import {
  OrgRole,
  asId,
  forbidden,
  hasRole,
  unauthenticated,
  type OrganizationId,
  type TenantContext,
  type UserId,
} from '@soniq/core';
import { organizationMembers, schema } from '@soniq/db';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';
import { getSupabaseConfig } from '../config.js';
import { getDb } from '../lib/db.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireAuth`. */
    userId?: UserId;
    /** Set by `requireTenant`. Required by every tenant-scoped repository call. */
    tenant?: TenantContext;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest) => Promise<void>;
    /** Curried so routes can declare a minimum role: `app.requireTenant('admin')`. */
    requireTenant: (minimumRole?: OrgRole) => (request: FastifyRequest) => Promise<void>;
  }
}

const BEARER = /^Bearer\s+(.+)$/i;

const extractToken = (request: FastifyRequest): string => {
  const header = request.headers.authorization;
  if (typeof header !== 'string') throw unauthenticated('Missing Authorization header.');
  const match = BEARER.exec(header);
  if (!match?.[1]) throw unauthenticated('Authorization header must be a Bearer token.');
  return match[1];
};

/**
 * The organization is taken from an explicit header rather than inferred from the user's
 * memberships. A user can belong to several organizations, and silently picking one for
 * them is how cross-tenant writes happen.
 */
const ORG_HEADER = 'x-organization-id';

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('requireAuth', async (request: FastifyRequest): Promise<void> => {
    const token = extractToken(request);
    const secret = new TextEncoder().encode(getSupabaseConfig().SUPABASE_JWT_SECRET);

    try {
      const { payload } = await jwtVerify(token, secret);
      if (typeof payload.sub !== 'string') {
        throw unauthenticated('Token is missing a subject claim.');
      }
      request.userId = asId<UserId>(payload.sub);
    } catch (cause) {
      // Never relay the underlying JWT library message — it distinguishes "expired" from
      // "bad signature", which is more than an unauthenticated caller should learn.
      request.log.info({ err: cause }, 'JWT verification failed');
      throw unauthenticated('Invalid or expired token.');
    }
  });

  app.decorate(
    'requireTenant',
    (minimumRole: OrgRole = OrgRole.VIEWER) =>
      async (request: FastifyRequest): Promise<void> => {
        if (request.userId === undefined) {
          await app.requireAuth(request);
        }
        const userId = request.userId!;

        const header = request.headers[ORG_HEADER];
        const organizationId = typeof header === 'string' ? header.trim() : '';
        if (organizationId === '') {
          throw forbidden(`Missing ${ORG_HEADER} header.`);
        }

        const [membership] = await getDb()
          .select({ role: organizationMembers.role })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, organizationId),
            ),
          )
          .limit(1);

        // Deliberately the same error for "not a member" and "no such organization".
        // Distinguishing them would let anyone enumerate which organization IDs exist.
        if (membership === undefined) {
          throw forbidden('You do not have access to this organization.');
        }

        const role = membership.role as OrgRole;
        if (!hasRole(role, minimumRole)) {
          throw forbidden(`This action requires the ${minimumRole} role or higher.`);
        }

        request.tenant = {
          organizationId: asId<OrganizationId>(organizationId),
          userId,
          role,
        };
      },
  );
});

/** Narrows `request.tenant` for handlers that ran behind `requireTenant`. */
export const tenantOf = (request: FastifyRequest): TenantContext => {
  if (request.tenant === undefined) {
    throw forbidden('Tenant context was not resolved for this request.');
  }
  return request.tenant;
};

export { schema };
