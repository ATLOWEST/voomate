/**
 * The crawler.
 *
 * Given a merchant's website address, produce the readable text of their site. Three ideas
 * shape it:
 *
 *  1. **The sitemap is better than the links.** A sitemap is the site owner listing the pages
 *     they consider real, already free of the pagination, faceted-search and calendar loops
 *     that turn link-following into an infinite walk. Link discovery is the fallback, not the
 *     plan.
 *  2. **Budgets are enforced, not requested.** `maxPages` and `maxDepth` bound the work, but so
 *     do URL normalisation and the exclusion of asset extensions — most runaway crawls are not
 *     big sites, they are one page reachable by ten thousand distinct URLs.
 *  3. **Pages are handed over as they arrive.** `onPage` is awaited per page rather than the
 *     whole crawl being collected and returned, so a merchant watching the dashboard sees the
 *     count climbing, and a crawl that dies at page 400 keeps the 400.
 */
import { extractPage, type ExtractedPage } from './extract.js';
import { fetchPage, fetchRobots, FetchError } from './fetch.js';
import { ALLOW_ALL, isAllowed, parseRobots, type RobotsRules } from './robots.js';
import * as cheerio from 'cheerio';

export interface CrawledPage extends ExtractedPage {
  readonly url: string;
  readonly depth: number;
}

export interface CrawlOptions {
  readonly rootUrl: string;
  readonly maxPages: number;
  readonly maxDepth: number;
  readonly excludePatterns?: readonly string[];
  /** Awaited per page. Throwing here aborts the crawl — it means we cannot store results. */
  readonly onPage: (page: CrawledPage) => Promise<void>;
  /**
   * Called for every safely fetched HTML page before readability filtering. Discovery uses this
   * for route inventory, while knowledge ingestion can continue ignoring empty SPA shells.
   */
  readonly onDiscoveredPage?: (page: CrawledPage) => Promise<void>;
  /** Progress and diagnostics. Never throws the crawl off course. */
  readonly onEvent?: (event: CrawlEvent) => void;
  readonly signal?: AbortSignal;
}

export type CrawlEvent =
  | { readonly kind: 'robots'; readonly rules: RobotsRules }
  | { readonly kind: 'sitemap'; readonly url: string; readonly urls: number }
  | { readonly kind: 'page'; readonly url: string; readonly chars: number }
  | { readonly kind: 'skip'; readonly url: string; readonly reason: string }
  | { readonly kind: 'fail'; readonly url: string; readonly reason: string };

export interface CrawlSummary {
  readonly pages: number;
  readonly skipped: number;
  readonly failed: number;
  /** Pages that returned HTML with no readable text — candidates for a future render pass. */
  readonly appShells: number;
  readonly usedSitemap: boolean;
}

/** Extensions that are never a readable page. Cheaper to reject than to fetch and find out. */
const ASSET_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|mp[34]|m4[av]|mov|avi|webm|ogg|wav|flac|pdf|docx?|xlsx?|pptx?|zip|gz|tar|rar|7z|dmg|exe|apk|css|js|mjs|json|xml|rss|atom|woff2?|ttf|eot|txt|csv)$/i;

/**
 * Query parameters that identify a visitor or a campaign, never a page.
 *
 * Stripping these is the highest-value line in the file. One product page shared across six
 * campaigns is six URLs, six fetches, six near-identical documents, and six chunks competing
 * for the same query — which degrades retrieval quality, not just cost.
 */
const TRACKING_PARAMS =
  /^(utm_|ga_|_ga|gclid|dclid|fbclid|msclkid|mc_[ce]id|igshid|ref|referrer|source|campaign|yclid|twclid|s_kwcid|trk|sessionid|phpsessid|jsessionid)/i;

/**
 * One canonical spelling per page.
 *
 * Deliberately aggressive, including sorting the surviving query parameters: `?colour=red&size=l`
 * and `?size=l&colour=red` are one page, and treating them as two is how a 50-page shop becomes
 * a 5,000-page crawl.
 */
export const normalizeUrl = (value: string, base?: string): string | null => {
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  url.hash = '';
  url.username = '';
  url.password = '';
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [key, value_] of kept) url.searchParams.append(key, value_);

  // `/about/` and `/about` are one page everywhere except in a crawler that believes otherwise.
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString();
};

/** www.example.com and example.com are the same site; shop.example.com is not. */
const sameSite = (a: URL, b: URL): boolean => {
  const strip = (host: string): string => host.replace(/^www\./, '');
  return strip(a.hostname) === strip(b.hostname);
};

const globToRegExp = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`,
    'i',
  );

/**
 * Read a sitemap, following `<sitemapindex>` one level down.
 *
 * Large sites split their sitemap into an index of sitemaps, so stopping at the first document
 * finds a list of files and no pages at all. Bounded at `limit` URLs and one level of nesting —
 * a sitemap index pointing at itself is a real thing that exists in the wild.
 */
const readSitemap = async (
  url: string,
  limit: number,
  onEvent: (event: CrawlEvent) => void,
  depth = 0,
): Promise<string[]> => {
  if (depth > 1) return [];

  let body: string;
  try {
    body = (await fetchPage(url, { timeoutMs: 10_000 })).body;
  } catch (error) {
    onEvent({
      kind: 'skip',
      url,
      reason: error instanceof FetchError ? error.message : 'unreadable',
    });
    return [];
  }

  const $ = cheerio.load(body, { xml: true });
  const nested = $('sitemapindex > sitemap > loc')
    .map((_, element) => $(element).text().trim())
    .get()
    .slice(0, 25);

  if (nested.length > 0) {
    const collected: string[] = [];
    for (const child of nested) {
      if (collected.length >= limit) break;
      collected.push(...(await readSitemap(child, limit - collected.length, onEvent, depth + 1)));
    }
    onEvent({ kind: 'sitemap', url, urls: collected.length });
    return collected;
  }

  const urls = $('urlset > url > loc')
    .map((_, element) => $(element).text().trim())
    .get()
    .slice(0, limit);

  onEvent({ kind: 'sitemap', url, urls: urls.length });
  return urls;
};

/**
 * A gate that spaces out request starts.
 *
 * Concurrency alone is not politeness — three workers with no gate is three simultaneous hits.
 * This serialises the *start* of each request by at least `intervalMs` while letting the
 * responses overlap, which is the behaviour a site operator would recognise as considerate.
 */
const createPacer = (intervalMs: number): (() => Promise<void>) => {
  let next = 0;
  return async () => {
    const now = Date.now();
    const start = Math.max(now, next);
    next = start + intervalMs;
    if (start > now) await new Promise((resolve) => setTimeout(resolve, start - now));
  };
};

export const crawlSite = async (options: CrawlOptions): Promise<CrawlSummary> => {
  const onEvent = options.onEvent ?? ((): void => undefined);
  const root = normalizeUrl(options.rootUrl);
  if (root === null) throw new Error(`Not a crawlable URL: ${options.rootUrl}`);

  const rootUrl = new URL(root);
  const excludes = (options.excludePatterns ?? []).map(globToRegExp);

  const robotsText = await fetchRobots(rootUrl.origin);
  const rules = robotsText === null ? ALLOW_ALL : parseRobots(robotsText);
  onEvent({ kind: 'robots', rules });

  // Politeness: honour an explicit Crawl-delay exactly, and fall back to a gap that a site
  // owner reading their access log would not notice.
  const pace = createPacer(rules.crawlDelayMs ?? 200);
  const workers = rules.crawlDelayMs === null ? 3 : 1;

  const seen = new Set<string>([root]);
  const queue: Array<{ url: string; depth: number }> = [{ url: root, depth: 0 }];

  // Sitemaps declared in robots.txt first, then the conventional location. Both are tried:
  // plenty of sites have one and not the other.
  const sitemapCandidates = [
    ...new Set([
      ...rules.sitemaps,
      new URL('/sitemap.xml', rootUrl.origin).toString(),
      new URL('/sitemap_index.xml', rootUrl.origin).toString(),
    ]),
  ];

  let usedSitemap = false;
  for (const candidate of sitemapCandidates) {
    if (queue.length >= options.maxPages) break;
    const urls = await readSitemap(candidate, options.maxPages - queue.length, onEvent);
    if (urls.length === 0) continue;
    usedSitemap = true;
    for (const raw of urls) {
      const normalized = normalizeUrl(raw, root);
      if (normalized === null || seen.has(normalized)) continue;
      if (!sameSite(new URL(normalized), rootUrl)) continue;
      seen.add(normalized);
      // Depth 0: the site owner listed it, so it is not "three clicks deep" by any measure
      // that matters.
      queue.push({ url: normalized, depth: 0 });
    }
  }

  let pages = 0;
  let skipped = 0;
  let failed = 0;
  let appShells = 0;
  let cursor = 0;

  const admissible = (candidate: string, depth: number): string | null => {
    if (depth > options.maxDepth) return null;
    const normalized = normalizeUrl(candidate, root);
    if (normalized === null || seen.has(normalized)) return null;

    const url = new URL(normalized);
    if (!sameSite(url, rootUrl)) return null;
    if (ASSET_EXTENSIONS.test(url.pathname)) return null;
    if (excludes.some((pattern) => pattern.test(url.pathname + url.search))) return null;
    if (!isAllowed(rules, url.pathname + url.search)) return null;

    return normalized;
  };

  const worker = async (): Promise<void> => {
    for (;;) {
      if (options.signal?.aborted === true) return;
      if (pages >= options.maxPages) return;

      const index = cursor;
      if (index >= queue.length) return;
      cursor += 1;

      const item = queue[index]!;

      // Re-checked at pop time rather than only at push time: the budget is shared between
      // workers and the queue was filled before any of them ran.
      if (!isAllowed(rules, new URL(item.url).pathname)) {
        skipped += 1;
        onEvent({ kind: 'skip', url: item.url, reason: 'robots.txt' });
        continue;
      }

      await pace();

      let extracted: CrawledPage;
      try {
        const fetched = await fetchPage(item.url);
        // The URL after redirects may already have been crawled under its other spelling.
        const landed = normalizeUrl(fetched.url) ?? item.url;
        if (landed !== item.url && seen.has(landed)) {
          skipped += 1;
          continue;
        }
        seen.add(landed);
        extracted = { ...extractPage(fetched.body, landed), url: landed, depth: item.depth };
      } catch (error) {
        failed += 1;
        onEvent({
          kind: 'fail',
          url: item.url,
          reason: error instanceof FetchError ? error.message : String(error),
        });
        continue;
      }

      for (const link of extracted.links) {
        if (queue.length >= options.maxPages * 3) break;
        const next = admissible(link, item.depth + 1);
        if (next === null) continue;
        seen.add(next);
        queue.push({ url: next, depth: item.depth + 1 });
      }

      if (extracted.looksLikeAppShell) appShells += 1;

      // A route is still a real route when it is a client-rendered shell. Keep discovery
      // separate from readability so we never pollute a knowledge base with empty documents.
      await options.onDiscoveredPage?.(extracted);

      if (extracted.text.length < 120) {
        skipped += 1;
        onEvent({ kind: 'skip', url: extracted.url, reason: 'no readable text' });
        continue;
      }

      if (pages >= options.maxPages) return;
      pages += 1;
      onEvent({ kind: 'page', url: extracted.url, chars: extracted.text.length });
      await options.onPage(extracted);
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));

  return { pages, skipped, failed, appShells, usedSitemap };
};
