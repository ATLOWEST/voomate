import { z } from 'zod';

/**
 * The places in a browser product where a Web Agent may run. This policy is deliberately
 * small and portable: hosts describe their own visible surfaces, while the control plane
 * enforces the origin and path boundary. It is never a request to inspect source code or
 * private application data.
 */
/**
 * `marketing_site` and `merchant_dashboard` remain readable for deployments created before
 * the general route policy. New installations use the source of the rule rather than making
 * Voomate-specific assumptions about a customer's product.
 */
export const webSurfaceKindSchema = z.enum([
  'declared',
  'observed',
  'manual',
  'legacy',
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
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/, 'Use a simple surface ID.'),
  name: z.string().trim().min(2).max(60),
  kind: webSurfaceKindSchema,
  origin: bareOriginSchema,
  pathPrefixes: z.array(pathPrefixSchema).min(1).max(20),
  /** Exact pages disabled by a merchant. Unlike a prefix, `/agents` does not disable children. */
  excludedPaths: z.array(pathPrefixSchema).max(240).default([]),
  /** Narrow a broad area without needing to create a conflicting second rule. */
  excludedPathPrefixes: z.array(pathPrefixSchema).max(40).default([]),
  /** Private product areas may refuse anonymous sessions and require a signed user token. */
  identity: z.enum(['anonymous', 'required']).optional(),
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
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each surface needs a unique ID.',
        });
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

export function normalizePathPrefix(value: string): string {
  const normalized = value.trim().replace(/\/+/g, '/');
  if (normalized === '/') return '/';
  return normalized.replace(/\/+$/, '') || '/';
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
 * Older agents predate explicit surfaces. Their existing origin allowlist remains compatible.
 * No product-owned path is silently excluded: only the tenant's saved policy decides.
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
      kind: 'legacy' as const,
      origin,
      pathPrefixes: ['/'],
      excludedPaths: [],
      excludedPathPrefixes: [],
      identity: 'anonymous' as const,
      enabled: true,
    })),
  };
}

export function webSurfaceForLocation(
  policy: WebDeploymentPolicy,
  origin: string,
  pathname: string,
): WebSurfaceRule | undefined {
  return policy.surfaces.find(
    (surface) =>
      surface.enabled &&
      surface.origin === origin &&
      surface.pathPrefixes.some((prefix) => isPathWithinPrefix(pathname, prefix)) &&
      !surface.excludedPaths.some(
        (excludedPath) => normalizePathPrefix(excludedPath) === normalizePathPrefix(pathname),
      ) &&
      !surface.excludedPathPrefixes.some((prefix) => isPathWithinPrefix(pathname, prefix)),
  );
}
