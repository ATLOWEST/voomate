import { randomUUID } from 'node:crypto';
import { webDeploymentPolicyFromAppearance } from '@voomate/core';
import { agents, apiKeys, auditLogs } from '@voomate/db';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { fetchPage } from '../../lib/crawl/fetch.js';
import { getDb } from '../../lib/db.js';
import { hashApiKey, safeEqual } from '../../lib/keys.js';
import { WEB_AGENT_INSTALL_GRANT_SCOPE } from './identity.js';

export const INSTALL_GRANT_TTL_HOURS = 6;
export const MAX_INSTALL_GRANT_ORIGINS = 25;

export interface InstallationRoute {
  pathname: string;
  name?: string;
  source: 'current' | 'manifest' | 'navigation';
}

interface InstallationAgent {
  id: string;
  organizationId: string;
  embedKey: string;
  allowedOrigins: string[];
  appearance: unknown;
}

interface InstallationProofMetadata {
  platform?: string;
  origin?: string;
}

/** One predictable public file works on static sites, SPAs, and server-rendered applications. */
export function installationChallengePath(embedKey: string): string {
  return `/.well-known/voomate/${encodeURIComponent(embedKey)}.txt`;
}

export function normalizeInstallationRoutes(routes: readonly InstallationRoute[]) {
  const normalized = new Map<string, InstallationRoute>();
  for (const route of routes) {
    if (!route.pathname.startsWith('/') || route.pathname.includes('..')) continue;
    const pathname = route.pathname.replace(/\/+/g, '/').replace(/\/+$/g, '') || '/';
    if (normalized.has(pathname)) continue;
    normalized.set(pathname, {
      pathname,
      ...(route.name ? { name: route.name.slice(0, 120) } : {}),
      source: route.source,
    });
  }
  return Array.from(normalized.values()).slice(0, 240);
}

/**
 * Verify a new SDK origin without asking the merchant for a domain or permanent API key.
 *
 * The coding assistant publishes a short-lived grant at a fixed well-known path. Voomate fetches
 * that path from its own backend, validates the grant against the agent and tenant, then records
 * the exact origin and path-only route inventory atomically. Merely copying a public embed key is
 * never enough to authorize a domain.
 */
export async function verifyInstallationChallenge({
  agent,
  origin,
  pathname,
  routes,
  ipAddress,
}: {
  agent: InstallationAgent;
  origin: string;
  pathname: string;
  routes: readonly InstallationRoute[];
  ipAddress: string;
}): Promise<boolean> {
  const db = getDb();
  const existingProofs = await db
    .select({ metadata: auditLogs.metadata, createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, agent.organizationId),
        eq(auditLogs.resourceType, 'agent'),
        eq(auditLogs.resourceId, agent.id),
        eq(auditLogs.action, 'agent.installation_verified'),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));
  const currentPolicy = webDeploymentPolicyFromAppearance(agent.appearance, agent.allowedOrigins);
  if (
    agent.allowedOrigins.includes(origin) &&
    currentPolicy.surfaces.some((surface) => surface.origin === origin) &&
    existingProofs.some(
      (proof) => (proof.metadata as InstallationProofMetadata | null)?.origin === origin,
    )
  ) {
    return true;
  }

  const now = new Date();
  const grants = await db
    .select({ id: apiKeys.id, keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.organizationId, agent.organizationId),
        eq(apiKeys.agentId, agent.id),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
        sql`${WEB_AGENT_INSTALL_GRANT_SCOPE} = any(${apiKeys.scopes})`,
      ),
    );
  if (grants.length === 0) return false;

  if (new Set(agent.allowedOrigins).size >= MAX_INSTALL_GRANT_ORIGINS) return false;

  let challenge: string;
  try {
    const challengeUrl = new URL(installationChallengePath(agent.embedKey), `${origin}/`);
    const page = await fetchPage(challengeUrl.toString(), { timeoutMs: 7_000 });
    if (new URL(page.url).origin !== origin) return false;
    challenge = page.body.trim();
  } catch {
    return false;
  }
  if (!challenge.startsWith('ig_') || challenge.length > 160) return false;

  const challengeHash = hashApiKey(challenge);
  const grant = grants.find((candidate) => safeEqual(candidate.keyHash, challengeHash));
  if (!grant) return false;

  const routeInventory = normalizeInstallationRoutes(routes);
  await db.transaction(async (tx) => {
    const [freshAgent] = await tx
      .select({
        allowedOrigins: agents.allowedOrigins,
        appearance: agents.appearance,
      })
      .from(agents)
      .where(and(eq(agents.id, agent.id), eq(agents.organizationId, agent.organizationId)))
      .limit(1);
    if (!freshAgent) return;

    const currentPolicy = webDeploymentPolicyFromAppearance(
      freshAgent.appearance,
      freshAgent.allowedOrigins,
    );
    const existingSurface = currentPolicy.surfaces.find((surface) => surface.origin === origin);
    const hostname = new URL(origin).hostname;
    const policy = existingSurface
      ? currentPolicy
      : {
          ...currentPolicy,
          surfaces: [
            ...currentPolicy.surfaces,
            {
              id: `observed_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
              name: hostname,
              kind: 'observed' as const,
              origin,
              pathPrefixes: ['/'],
              excludedPaths: [],
              excludedPathPrefixes: [],
              identity: 'anonymous' as const,
              // Copying the one-click installer is the merchant's explicit request to make this
              // surface available. The agent lifecycle still gates whether visitors can use it.
              enabled: true,
            },
          ],
        };
    const allowedOrigins = Array.from(new Set([...freshAgent.allowedOrigins, origin]));
    if (!existingSurface || !freshAgent.allowedOrigins.includes(origin)) {
      await tx
        .update(agents)
        .set({
          allowedOrigins,
          appearance: { ...(freshAgent.appearance as object), webDeployment: policy },
          updatedAt: now,
        })
        .where(and(eq(agents.id, agent.id), eq(agents.organizationId, agent.organizationId)));
    }

    await tx.insert(auditLogs).values({
      organizationId: agent.organizationId,
      actorId: null,
      action: 'agent.installation_verified',
      resourceType: 'agent',
      resourceId: agent.id,
      metadata: {
        platform: 'web',
        origin,
        pathname,
        surfaceId: existingSurface?.id ?? policy.surfaces.at(-1)?.id,
        surfaceName: existingSurface?.name ?? hostname,
        sdk: 'embed-v2',
        routeInventory,
        verification: 'well-known-challenge',
        grantId: grant.id,
      },
      ipAddress,
    });
    await tx
      .update(apiKeys)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(
        and(
          eq(apiKeys.id, grant.id),
          eq(apiKeys.organizationId, agent.organizationId),
          eq(apiKeys.agentId, agent.id),
          isNull(apiKeys.revokedAt),
        ),
      );
  });
  return true;
}
