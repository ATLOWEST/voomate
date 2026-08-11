/**
 * Authentication and tenant resolution.
 *
 * Two separate concerns, deliberately separate decorators:
 *
 *   `requireAuth`   — proves who you are (a valid Supabase JWT).
 *   `requireTenant` — proves which organization you're acting in, and with what role.
 *
 * Authentication alone grants nothing. Every tenant-scoped route needs both, and the
 * resulting `TenantContext` is what repositories require — see `tenantScope` in @voomate/db.
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
} from '@voomate/core';
import { organizationMembers, schema } from '@voomate/db';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';
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

/**
 * Supabase's published signing keys.
 *
 * Projects now sign user tokens asymmetrically (ES256) and publish the public half here, so
 * the API verifies signatures while holding nothing that could forge one. `createRemoteJWKSet`
 * caches the fetch and re-fetches on an unrecognised `kid`, which is what makes a key rotation
 * a non-event rather than an outage.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const getJwks = (): ReturnType<typeof createRemoteJWKSet> => {
  jwks ??= createRemoteJWKSet(
    new URL('/auth/v1/.well-known/jwks.json', getSupabaseConfig().SUPABASE_URL),
    // A cold start plus a slow JWKS fetch must not hang a request indefinitely. 5s is
    // generous for a cached CDN document and still well inside any sane client timeout.
    { timeoutDuration: 5000, cooldownDuration: 30_000 },
  );
  return jwks;
};

/**
 * Verify a Supabase access token.
 *
 * Two signing schemes, chosen by the token's own `alg` header rather than by configuration —
 * a project can be mid-migration and issue both, and reading the header is how we handle a
 * token minted before the switch without a redeploy.
 *
 * The `alg` is only used to route to the right key material, never trusted beyond that:
 * `jwtVerify` is given an explicit algorithm list either way, so a token claiming `alg: none`
 * or trying to pass an HS256 MAC off against the EC public key is rejected by the library.
 */
const verifyToken = async (token: string): Promise<JWTPayload> => {
  const alg = decodeProtectedHeader(token).alg ?? '';

  if (alg.startsWith('HS')) {
    const secret = getSupabaseConfig().SUPABASE_JWT_SECRET;
    if (secret === undefined || secret === '') {
      throw unauthenticated('Invalid or expired token.');
    }
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return payload;
  }

  const { payload } = await jwtVerify(token, getJwks(), { algorithms: ['ES256', 'RS256'] });
  return payload;
};

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('requireAuth', async (request: FastifyRequest): Promise<void> => {
    const token = extractToken(request);

    try {
      const payload = await verifyToken(token);
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
