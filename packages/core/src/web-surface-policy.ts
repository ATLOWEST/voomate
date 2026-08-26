import { z } from 'zod';

/**
 * The places in a browser product where a Web Agent may run. This policy is deliberately
 * small and portable: hosts describe their own visible surfaces, while the control plane
 * enforces the origin and path boundary. It is never a request to inspect source code or
 * private application data.
 */
export const webSurfaceKindSchema = z.enum([
  'marketing_site',
  'merchant_dashboard',
  'custom',
]);

export type WebSurfaceKind = z.infer<typeof webSurfaceKindSchema>;

const pathPrefixSchema = z
  .string()
  .min(1)
  .max(240)
  .refine((value) => value.startsWith('/'), 'A page path must start with /.')
  .refine(
    (value) => !value.includes('?') && !value.includes('#') && !value.includes('..'),
    'Use a clean page path without a query, fragment, or parent directory.',
  );

const bareOriginSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.pathname === '/' && url.search === '' && url.hash === '';
  }, 'Use a bare origin such as https://example.com.');

export const webSurfaceRuleSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/, 'Use a simple surface ID.'),
  name: z.string().trim().min(2).max(60),
  kind: webSurfaceKindSchema,
  origin: bareOriginSchema,
  pathPrefixes: z.array(pathPrefixSchema).min(1).max(20),
  enabled: z.boolean(),
});

export type WebSurfaceRule = z.infer<typeof webSurfaceRuleSchema>;

export const webDeploymentPolicySchema = z
  .object({
    version: z.literal(1).default(1),
    surfaces: z.array(webSurfaceRuleSchema).max(20),
  })
  .superRefine((policy, context) => {
    const ids = new Set<string>();
    const targets = new Set<string>();
    for (const surface of policy.surfaces) {
      if (ids.has(surface.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Each surface needs a unique ID.' });
      }
      ids.add(surface.id);
      if (!surface.enabled) continue;
      for (const prefix of surface.pathPrefixes) {
        const target = `${surface.origin}${normalizePathPrefix(prefix)}`;
        if (targets.has(target)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Each enabled location can be listed only once.',
          });
        }
        targets.add(target);
      }
    }
  });

export type WebDeploymentPolicy = z.infer<typeof webDeploymentPolicySchema>;

export const SUPER_ADMIN_PATH_PREFIX = '/admin';

export function normalizePathPrefix(value: string): string {
  const normalized = value.trim().replace(/\/+/g, '/');
  if (normalized === '/') return '/';
  return normalized.replace(/\/+$/, '') || '/';
}

/** The Super Admin portal is a platform control plane, never a merchant Web Agent surface. */
export function isProtectedWebAgentPath(pathname: string): boolean {
  const normalized = normalizePathPrefix(pathname);
  return normalized === SUPER_ADMIN_PATH_PREFIX || normalized.startsWith(`${SUPER_ADMIN_PATH_PREFIX}/`);
}

export function isPathWithinPrefix(pathname: string, prefix: string): boolean {
  const normalizedPath = normalizePathPrefix(pathname);
  const normalizedPrefix = normalizePathPrefix(prefix);
  return (
    normalizedPrefix === '/' ||
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  );
}

/**
 * Older agents predate explicit surfaces. Their existing origin allowlist remains compatible,
 * but protected Super Admin paths are still excluded by the shared guard above.
 */
export function webDeploymentPolicyFromAppearance(
  appearance: unknown,
  allowedOrigins: readonly string[],
): WebDeploymentPolicy {
  const candidate =
    typeof appearance === 'object' && appearance !== null && 'webDeployment' in appearance
      ? (appearance as { webDeployment?: unknown }).webDeployment
      : undefined;
  const parsed = webDeploymentPolicySchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  return {
    version: 1,
    surfaces: allowedOrigins.map((origin, index) => ({
      id: `legacy_${index + 1}`,
      name: `Approved site ${index + 1}`,
      kind: 'custom' as const,
      origin,
      pathPrefixes: ['/'],
      enabled: true,
    })),
  };
}

export function webSurfaceForLocation(
  policy: WebDeploymentPolicy,
  origin: string,
  pathname: string,
): WebSurfaceRule | undefined {
  if (isProtectedWebAgentPath(pathname)) return undefined;
  return policy.surfaces.find(
    (surface) =>
      surface.enabled &&
      surface.origin === origin &&
      surface.pathPrefixes.some((prefix) => isPathWithinPrefix(pathname, prefix)),
  );
}
