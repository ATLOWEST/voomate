import { z } from 'zod';
import { webSurfaceForLocation, type WebDeploymentPolicy } from '@voomate/core';

export type PortalRole = 'super_admin' | 'merchant_admin' | 'end_user';

/**
 * A portal is a UI boundary, not an authorization decision. It prevents the assistant from
 * advertising sibling dashboards while the host's real authorization still decides who may
 * open a route.
 */
export function portalScopeForUrl(value: string): string {
  try {
    const [segment] = new URL(value).pathname.split('/').filter(Boolean);
    if (!segment) return '/';
    return ['admin', 'app', 'store', 'account'].includes(segment) ? `/${segment}` : '/';
  } catch {
    return '/';
  }
}

export function portalRoleForScope(scope: string): PortalRole {
  if (scope === '/admin') return 'super_admin';
  if (scope === '/store' || scope === '/account') return 'end_user';
  return 'merchant_admin';
}

const nativeDestinationSchema = z
  .object({
    url: z.string().url().max(2_048),
    storeUrl: z.string().url().max(2_048).optional(),
  })
  .strict();

export const pageContextSchema = z
  .object({
    url: z.string().url().max(2_048),
    title: z.string().trim().max(200).default(''),
    description: z.string().trim().max(800).default(''),
    portalScope: z
      .string()
      .regex(/^\/(?:[a-z0-9_-]+)?$/)
      .optional(),
    activeRole: z.enum(['super_admin', 'merchant_admin', 'end_user']).optional(),
    headings: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
    navigation: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(120),
            url: z.string().url().max(2_048),
            description: z.string().trim().max(600).optional(),
            aliases: z.array(z.string().trim().min(1).max(80)).max(16).optional(),
            facts: z.array(z.string().trim().min(1).max(300)).max(24).optional(),
            portalScope: z
              .string()
              .regex(/^\/(?:[a-z0-9_-]+)?$/)
              .optional(),
            native: z
              .object({
                ios: nativeDestinationSchema.optional(),
                android: nativeDestinationSchema.optional(),
              })
              .strict()
              .optional(),
            navigationKind: z.enum(['same_origin', 'trusted_handoff']).optional(),
          })
          .strict(),
      )
      .max(40)
      .default([]),
    surface: z
      .object({
        id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(600),
        aliases: z.array(z.string().trim().min(1).max(80)).max(16).optional(),
        facts: z.array(z.string().trim().min(1).max(300)).max(24).optional(),
      })
      .strict()
      .optional(),
    businessSummary: z.string().trim().min(1).max(1_200).optional(),
    operatingState: z
      .object({
        source: z.literal('host_ui'),
        agentInventory: z
          .object({
            total: z.number().int().min(0).max(10_000),
            active: z.number().int().min(0).max(10_000),
            draft: z.number().int().min(0).max(10_000),
            paused: z.number().int().min(0).max(10_000),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const inventory = value.operatingState?.agentInventory;
    if (inventory && inventory.active + inventory.draft + inventory.paused !== inventory.total) {
      context.addIssue({
        code: 'custom',
        path: ['operatingState', 'agentInventory'],
        message: 'Agent inventory counts must add up to the total.',
      });
    }
  });

export type WebAgentPageContext = z.infer<typeof pageContextSchema>;

export function pageContextRoleGuidance(context: WebAgentPageContext | undefined): string {
  if (!context) return '';
  const portalScope = context.portalScope ?? portalScopeForUrl(context.url);
  const activeRole = context.activeRole ?? portalRoleForScope(portalScope);
  const destinations = context.navigation
    .map(({ label }) => label)
    .slice(0, 16)
    .join(', ');
  const roleFocus =
    activeRole === 'super_admin'
      ? 'You are assisting a platform operator with infrastructure and workspace administration.'
      : activeRole === 'end_user'
        ? 'You are assisting a customer with the public storefront or account experience.'
        : 'You are assisting a workspace operator with business agents and settings.';
  return [
    `Active portal boundary: ${portalScope}. ${roleFocus}`,
    `Use the exact visible UI labels from this portal only: ${destinations || 'no verified destinations'}.`,
    'Do not mention, suggest, or navigate to sibling portals. Page context never grants access to private data or actions.',
  ].join(' ');
}

export interface NavigateClientCommand {
  type: 'navigate';
  url: string;
  label: string;
  intent: 'web' | 'open_app' | 'install_app';
  native?: {
    ios?: { url: string; storeUrl?: string };
    android?: { url: string; storeUrl?: string };
  };
}

function sameOriginUrl(value: string, origin: string): string | undefined {
  try {
    const url = new URL(value);
    return url.origin.toLowerCase() === origin ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function trustedNavigationUrl(
  value: string,
  origin: string,
  policy: WebDeploymentPolicy | undefined,
): { url: string; navigationKind: 'same_origin' | 'trusted_handoff' } | undefined {
  const sameOrigin = sameOriginUrl(value, origin);
  if (sameOrigin) return { url: sameOrigin, navigationKind: 'same_origin' };
  if (!policy) return undefined;
  const url = safeHttpsUrl(value);
  if (!url) return undefined;
  const parsed = new URL(url);
  return webSurfaceForLocation(policy, parsed.origin, parsed.pathname)
    ? { url, navigationKind: 'trusted_handoff' }
    : undefined;
}

function safeHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function safeStoreUrl(value: string | undefined, platform: 'ios' | 'android'): string | undefined {
  const url = safeHttpsUrl(value);
  if (!url) return undefined;
  const expectedHost = platform === 'ios' ? 'apps.apple.com' : 'play.google.com';
  return new URL(url).hostname.toLowerCase() === expectedHost ? url : undefined;
}

/** Re-check every browser-provided URL against the origin already bound into the widget JWT. */
export function sanitizePageContext(
  input: WebAgentPageContext | undefined,
  origin: string,
  policy?: WebDeploymentPolicy,
): WebAgentPageContext | undefined {
  if (!input) return undefined;
  const url = sameOriginUrl(input.url, origin);
  if (!url) return undefined;
  const navigation = input.navigation.flatMap((item) => {
    const destination = trustedNavigationUrl(item.url, origin, policy);
    if (!destination) return [];
    const native: NonNullable<WebAgentPageContext['navigation'][number]['native']> = {};
    for (const platform of ['ios', 'android'] as const) {
      const destination = item.native?.[platform];
      const nativeUrl = safeHttpsUrl(destination?.url);
      if (!nativeUrl) continue;
      const storeUrl = safeStoreUrl(destination?.storeUrl, platform);
      native[platform] = { url: nativeUrl, ...(storeUrl ? { storeUrl } : {}) };
    }
    return [
      {
        ...item,
        url: destination.url,
        navigationKind: destination.navigationKind,
        portalScope: portalScopeForUrl(destination.url),
        ...(Object.keys(native).length ? { native } : {}),
      },
    ];
  });
  const portalScope = portalScopeForUrl(url);
  return {
    ...input,
    url,
    portalScope,
    activeRole: portalRoleForScope(portalScope),
    navigation,
  };
}
