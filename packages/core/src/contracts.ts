/**
 * API contracts.
 *
 * Zod schemas shared by the API (which validates against them) and the dashboard (which
 * infers its request types from them). One definition, so a contract change is a compile
 * error on both sides rather than a runtime surprise in production.
 */
import { MAX_CANDIDATE_LANGUAGES, isKnownLanguage, validateLanguageSet } from '@voomate/i18n';
import { z } from 'zod';
import { AgentCatalogType } from './agent-catalog.js';

// --- Primitives --------------------------------------------------------------------------

export const uuidSchema = z.string().uuid();

export const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers and hyphens.');

export const languageCodeSchema = z
  .string()
  .refine(isKnownLanguage, { message: 'Unsupported language.' });

export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour, e.g. #4F46E5.');

/**
 * A website URL the merchant controls.
 *
 * Rejects non-HTTP schemes and, in production, private/loopback hosts — the crawler follows
 * these URLs server-side, so an unchecked value is a server-side request forgery vector.
 * The host check is enforced again at crawl time; validation here is the first gate, not
 * the only one.
 */
export const websiteUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  }, 'Must be an http or https URL.');

export const originSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.pathname === '/' && url.search === '' && url.hash === '';
  }, 'Must be a bare origin, e.g. https://example.com — no path.');

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});
export type Pagination = z.infer<typeof paginationSchema>;

// --- Organizations -------------------------------------------------------------------------

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(80),
  slug: slugSchema.optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'developer', 'admin']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

// --- Agents ----------------------------------------------------------------------------------

/**
 * Language config, with the AWS constraints enforced at the contract boundary rather than
 * discovered when a voice session fails to start. `validateLanguageSet` carries the real
 * rules — notably one dialect per base language, which rejects e.g. en-US + en-IN.
 */
export const agentLanguageConfigSchema = z
  .object({
    languages: z.array(languageCodeSchema).min(1).max(MAX_CANDIDATE_LANGUAGES),
    primaryLanguage: languageCodeSchema,
    codeSwitching: z.boolean().default(true),
    voiceTier: z.enum(['generative', 'long-form', 'neural', 'standard']).default('generative'),
    voiceOverrides: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.languages.includes(value.primaryLanguage)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['primaryLanguage'],
        message: 'The primary language must be one of the selected languages.',
      });
    }

    for (const problem of validateLanguageSet(value.languages).problems) {
      if (problem.severity === 'error') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['languages'],
          message: problem.message,
        });
      }
    }
  });

export const agentPersonaSchema = z.object({
  displayName: z.string().min(1).max(40),
  tone: z.enum(['professional', 'friendly', 'concise', 'warm']).default('friendly'),
  instructions: z.string().max(4000).optional(),
  // Kept short deliberately — a long greeting feels sluggish when spoken aloud.
  greeting: z.string().max(280).optional(),
  fallbackMessage: z.string().max(280).optional(),
  restrictedTopics: z.array(z.string().max(80)).max(20).optional(),
});

export const agentAppearanceSchema = z.object({
  primaryColor: hexColorSchema.default('#4F46E5'),
  position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
  logoUrl: z.string().url().optional(),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
});

export const createAgentSchema = z.object({
  catalogType: z
    .enum([
      AgentCatalogType.WEB,
      AgentCatalogType.CRM,
      AgentCatalogType.SEO,
      AgentCatalogType.CALLING,
    ])
    .default(AgentCatalogType.WEB),
  // A workspace chooses an agent capability first. Naming and channel installation happen
  // inside that agent later, so neither field belongs in the creation flow.
  name: z.string().min(1).max(80).optional(),
  websiteUrl: websiteUrlSchema.optional(),
  language: agentLanguageConfigSchema.optional(),
  persona: agentPersonaSchema.partial().optional(),
  appearance: agentAppearanceSchema.partial().optional(),
});
export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const agentDeploymentPlatformSchema = z.enum([
  'website',
  'web_app',
  'ios',
  'android',
]);
export type AgentDeploymentPlatform = z.infer<typeof agentDeploymentPlatformSchema>;

export const selectAgentDeploymentSchema = z.object({
  platform: agentDeploymentPlatformSchema,
});
export type SelectAgentDeploymentInput = z.infer<typeof selectAgentDeploymentSchema>;

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  language: agentLanguageConfigSchema.optional(),
  persona: agentPersonaSchema.partial().optional(),
  appearance: agentAppearanceSchema.partial().optional(),
  allowedOrigins: z.array(originSchema).max(50).optional(),
  voiceEnabled: z.boolean().optional(),
  retainAudio: z.boolean().optional(),
  transcriptRetentionDays: z.number().int().min(1).max(365).optional(),
});
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// --- Knowledge ---------------------------------------------------------------------------------

export const addWebsiteSourceSchema = z.object({
  url: websiteUrlSchema,
  /** Depth guard — an unbounded crawl on a large site is a runaway cost. */
  maxPages: z.number().int().min(1).max(5000).default(200),
  maxDepth: z.number().int().min(1).max(10).default(3),
  /** Glob patterns to skip, e.g. `/blog/*`, `*?print=true`. */
  excludePatterns: z.array(z.string().max(200)).max(50).optional(),
  refreshIntervalHours: z.number().int().min(1).max(720).optional(),
});
export type AddWebsiteSourceInput = z.infer<typeof addWebsiteSourceSchema>;

export const addQaPairSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
});
export type AddQaPairInput = z.infer<typeof addQaPairSchema>;

export const addManualTextSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
});
export type AddManualTextInput = z.infer<typeof addManualTextSchema>;

// --- Playground / chat ------------------------------------------------------------------------

export const playgroundMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: uuidSchema.optional(),
  language: languageCodeSchema.optional(),
});
export type PlaygroundMessageInput = z.infer<typeof playgroundMessageSchema>;

// --- Widget session -----------------------------------------------------------------------------

/**
 * Exchanges a public embed key for a short-lived scoped session token.
 *
 * `origin` is NOT read from this body — it is taken from the request's `Origin` header,
 * server-side. A client-supplied origin would make the allowlist meaningless.
 */
export const createWidgetSessionSchema = z.object({
  embedKey: z.string().min(16).max(128),
  channel: z.enum(['voice', 'text']).default('text'),
  pageUrl: z.string().url().optional(),
  /** Visitor's browser language, used as a hint only — never as the final answer. */
  preferredLanguage: languageCodeSchema.optional(),
});
export type CreateWidgetSessionInput = z.infer<typeof createWidgetSessionSchema>;
