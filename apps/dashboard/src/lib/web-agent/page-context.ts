import { z } from 'zod';

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
            native: z
              .object({
                ios: nativeDestinationSchema.optional(),
                android: nativeDestinationSchema.optional(),
              })
              .strict()
              .optional(),
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
  })
  .strict();

export type WebAgentPageContext = z.infer<typeof pageContextSchema>;

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
): WebAgentPageContext | undefined {
  if (!input) return undefined;
  const url = sameOriginUrl(input.url, origin);
  if (!url) return undefined;
  const navigation = input.navigation.flatMap((item) => {
    const itemUrl = sameOriginUrl(item.url, origin);
    if (!itemUrl) return [];
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
        url: itemUrl,
        ...(Object.keys(native).length ? { native } : {}),
      },
    ];
  });
  return { ...input, url, navigation };
}
