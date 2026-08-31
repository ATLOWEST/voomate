export interface VoomateUiPage {
  id: string;
  title: string;
  path: string;
  /**
   * Optional same-origin route patterns for a dynamic instance of this page (for example,
   * `/products/:handle` or `/orders/:orderId`). They classify passive page context only; they
   * never enable a surface, grant access, or declare an action.
   */
  pathPatterns?: readonly string[];
  description: string;
  /** Natural-language names visitors use for this destination. */
  aliases?: readonly string[];
  /** Public, curated facts the agent may synthesize when answering without navigation. */
  facts?: readonly string[];
  native?: VoomateNativeDestinations;
}

/**
 * An explicit, public handoff to a separately hosted surface such as an account portal or
 * dashboard. The runtime verifies it against the tenant's approved deployment policy before it
 * can become a browser command; manifest text alone never authorizes a cross-origin redirect.
 */
export interface VoomateUiTrustedDestination {
  id: string;
  title: string;
  url: string;
  description: string;
  aliases?: readonly string[];
  facts?: readonly string[];
}

export interface VoomateNativeDestination {
  /** HTTPS universal/app link registered to the native application. */
  url: string;
  /** Official store fallback. Used only for an explicit install/download request. */
  storeUrl?: string;
}

export interface VoomateNativeDestinations {
  ios?: VoomateNativeDestination;
  android?: VoomateNativeDestination;
}

export interface VoomateUiManifest {
  version: 1;
  businessSummary?: string;
  pages: readonly VoomateUiPage[];
  trustedDestinations?: readonly VoomateUiTrustedDestination[];
}

const PAGE_ID = /^[a-z][a-z0-9_-]{1,63}$/;
const PARAMETER_SEGMENT = /^:[A-Za-z][A-Za-z0-9_]{0,63}$/;

function text(value: string, name: string, max: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > max) throw new Error(`Invalid UI manifest ${name}.`);
  return normalized;
}

function path(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    throw new Error('UI manifest paths must be same-origin absolute paths.');
  }
  const parsed = new URL(value, 'https://manifest.voomate.invalid');
  if (parsed.origin !== 'https://manifest.voomate.invalid') {
    throw new Error('UI manifest paths must be same-origin absolute paths.');
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function pathPattern(value: string): string {
  const normalized = path(value);
  const parsed = new URL(normalized, 'https://manifest.voomate.invalid');
  if (parsed.search || parsed.hash) {
    throw new Error('UI manifest page patterns cannot contain query strings or fragments.');
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  for (const [index, segment] of segments.entries()) {
    if (segment === '*') {
      if (index !== segments.length - 1) {
        throw new Error('UI manifest wildcard must be the final route segment.');
      }
      continue;
    }
    if (segment.startsWith(':') && !PARAMETER_SEGMENT.test(segment)) {
      throw new Error('UI manifest route parameter is invalid.');
    }
  }
  return parsed.pathname;
}

function pathPatterns(values: readonly string[] | undefined): readonly string[] | undefined {
  if (!values) return undefined;
  if (!Array.isArray(values) || values.length > 12) {
    throw new Error('UI manifest page patterns must contain no more than 12 entries.');
  }
  return Object.freeze([...new Set(values.map(pathPattern))]);
}

/**
 * Matches a pathname against a passive UI manifest without inspecting page source, query values,
 * or browser history. Exact canonical paths win over dynamic patterns.
 */
export function matchUiPagePath(
  manifest: Pick<VoomateUiManifest, 'pages'>,
  pathname: string,
): Readonly<VoomateUiPage> | undefined {
  let current: string;
  try {
    current = new URL(pathname, 'https://manifest.voomate.invalid').pathname;
  } catch {
    return undefined;
  }
  const exact = manifest.pages.find((page) => new URL(page.path, 'https://manifest.voomate.invalid').pathname === current);
  if (exact) return exact;
  const currentSegments = current.split('/').filter(Boolean);
  return manifest.pages.find((page) =>
    page.pathPatterns?.some((pattern) => {
      const segments = pattern.split('/').filter(Boolean);
      let position = 0;
      for (const [index, segment] of segments.entries()) {
        if (segment === '*') return true;
        const candidate = currentSegments[position++];
        if (!candidate || (segment !== candidate && !PARAMETER_SEGMENT.test(segment))) return false;
        if (index === segments.length - 1 && position !== currentSegments.length) return false;
      }
      return position === currentSegments.length;
    }),
  );
}

function facts(values: readonly string[] | undefined): readonly string[] | undefined {
  if (!values) return undefined;
  if (!Array.isArray(values) || values.length > 24) {
    throw new Error('UI manifest page facts must contain no more than 24 entries.');
  }
  return Object.freeze(values.map((value) => text(value, 'page fact', 300)));
}

function aliases(values: readonly string[] | undefined): readonly string[] | undefined {
  if (!values) return undefined;
  if (!Array.isArray(values) || values.length > 16) {
    throw new Error('UI manifest page aliases must contain no more than 16 entries.');
  }
  const result = [...new Set(values.map((value) => text(value, 'page alias', 80).toLowerCase()))];
  return Object.freeze(result);
}

function httpsUrl(value: string, name: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error(`UI manifest ${name} must be a credential-free HTTPS URL.`);
  }
  return parsed.href;
}

function nativeDestinations(
  value: VoomateNativeDestinations | undefined,
): Readonly<VoomateNativeDestinations> | undefined {
  if (!value) return undefined;
  if (Object.keys(value).some((key) => !['ios', 'android'].includes(key))) {
    throw new Error('UI manifest native destinations contain an unsupported platform.');
  }
  const result: VoomateNativeDestinations = {};
  for (const platform of ['ios', 'android'] as const) {
    const destination = value[platform];
    if (!destination) continue;
    if (Object.keys(destination).some((key) => !['url', 'storeUrl'].includes(key))) {
      throw new Error('UI manifest native destinations cannot declare commands.');
    }
    const storeUrl = destination.storeUrl
      ? httpsUrl(destination.storeUrl, `${platform} store URL`)
      : undefined;
    if (storeUrl) {
      const storeHost = new URL(storeUrl).hostname.toLowerCase();
      const expected = platform === 'ios' ? 'apps.apple.com' : 'play.google.com';
      if (storeHost !== expected)
        throw new Error(`UI manifest ${platform} store URL is not official.`);
    }
    result[platform] = Object.freeze({
      url: httpsUrl(destination.url, `${platform} app link`),
      ...(storeUrl ? { storeUrl } : {}),
    });
  }
  return Object.keys(result).length ? Object.freeze(result) : undefined;
}

/**
 * Declares public, passive UI context for the Web Agent. The contract contains no callbacks,
 * selectors, generic commands, or mutation operations; write actions use separately scoped tools.
 */
export function defineUiManifest(input: {
  businessSummary?: string;
  pages: readonly VoomateUiPage[];
  trustedDestinations?: readonly VoomateUiTrustedDestination[];
}): Readonly<VoomateUiManifest> {
  if (!Array.isArray(input.pages) || input.pages.length === 0 || input.pages.length > 100) {
    throw new Error('A UI manifest needs 1-100 pages.');
  }
  const seen = new Set<string>();
  const pages = input.pages.map((page) => {
    if (
      Object.keys(page).some(
        (key) =>
          !['id', 'title', 'path', 'pathPatterns', 'description', 'aliases', 'facts', 'native'].includes(key),
      )
    ) {
      throw new Error('UI manifest pages cannot declare commands or additional fields.');
    }
    if (!PAGE_ID.test(page.id) || seen.has(page.id))
      throw new Error('Invalid UI manifest page ID.');
    seen.add(page.id);
    const native = nativeDestinations(page.native);
    const pagePatterns = pathPatterns(page.pathPatterns);
    const pageAliases = aliases(page.aliases);
    const pageFacts = facts(page.facts);
    return Object.freeze({
      id: page.id,
      title: text(page.title, 'page title', 120),
      path: path(page.path),
      ...(pagePatterns?.length ? { pathPatterns: pagePatterns } : {}),
      description: text(page.description, 'page description', 600),
      ...(pageAliases?.length ? { aliases: pageAliases } : {}),
      ...(pageFacts?.length ? { facts: pageFacts } : {}),
      ...(native ? { native } : {}),
    });
  });
  const trustedDestinations = input.trustedDestinations?.map((destination) => {
    if (
      Object.keys(destination).some(
        (key) => !['id', 'title', 'url', 'description', 'aliases', 'facts'].includes(key),
      )
    ) {
      throw new Error(
        'UI manifest trusted destinations cannot declare commands or additional fields.',
      );
    }
    if (!PAGE_ID.test(destination.id) || seen.has(destination.id)) {
      throw new Error('Invalid UI manifest trusted destination ID.');
    }
    seen.add(destination.id);
    const destinationAliases = aliases(destination.aliases);
    const destinationFacts = facts(destination.facts);
    return Object.freeze({
      id: destination.id,
      title: text(destination.title, 'trusted destination title', 120),
      url: httpsUrl(destination.url, 'trusted destination URL'),
      description: text(destination.description, 'trusted destination description', 600),
      ...(destinationAliases?.length ? { aliases: destinationAliases } : {}),
      ...(destinationFacts?.length ? { facts: destinationFacts } : {}),
    });
  });
  if (trustedDestinations && trustedDestinations.length > 20) {
    throw new Error('A UI manifest can declare no more than 20 trusted destinations.');
  }
  return Object.freeze({
    version: 1 as const,
    ...(input.businessSummary
      ? { businessSummary: text(input.businessSummary, 'business summary', 1_200) }
      : {}),
    pages: Object.freeze(pages),
    ...(trustedDestinations?.length
      ? { trustedDestinations: Object.freeze(trustedDestinations) }
      : {}),
  });
}

/** Escapes a validated manifest for an application/json script element. */
export function serializeUiManifest(manifest: Readonly<VoomateUiManifest>): string {
  return JSON.stringify(manifest)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}
