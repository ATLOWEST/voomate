/**
 * HTTP for the crawler.
 *
 * Every request here is to an address a merchant chose, made from inside our network, so this
 * file's job is to be paranoid on three axes at once:
 *
 *  - **Where it goes.** Redirects are followed manually, one hop at a time, and every hop is
 *    re-checked by the SSRF guard. `fetch`'s automatic redirect following would validate the
 *    first URL and then happily land on `http://169.254.169.254/`, which is the entire attack.
 *  - **How long it takes.** A server that accepts the connection and then sends one byte a
 *    minute will hold a crawl slot open forever. Every request carries a hard deadline.
 *  - **How much it returns.** `Content-Length` is a claim, not a fact. The body is read in
 *    chunks and abandoned the moment it exceeds the cap, so a 4GB "HTML page" costs us 2MB.
 */
import { assertCrawlableUrl } from '../url-guard.js';
import { USER_AGENT_TOKEN } from './robots.js';

/** Identifies us honestly and points at a page explaining what we are. Site owners check. */
export const CRAWLER_USER_AGENT = `Mozilla/5.0 (compatible; ${USER_AGENT_TOKEN}/1.0; +https://soniq.example/bot)`;

/**
 * Content types worth parsing.
 *
 * `application/xml` earns its place the hard way: it is what most servers send for
 * `sitemap.xml`, and leaving it out meant every sitemap was rejected as unreadable and the
 * crawler quietly fell back to following links. Nothing errored, nothing logged at warn — the
 * crawl just found fewer, worse pages. Failures that degrade quality without announcing
 * themselves are the expensive kind.
 */
const READABLE_TYPES =
  /^\s*(text\/html|text\/plain|text\/xml|application\/xml|application\/xhtml\+xml|[\w.+-]+\/[\w.+-]*\+xml)\s*(;|$)/i;

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

export interface FetchedPage {
  readonly url: string;
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
}

export class FetchError extends Error {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

const readCapped = async (response: Response): Promise<string> => {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_BYTES) {
    throw new FetchError(`Page is larger than ${String(MAX_BYTES)} bytes.`, response.url);
  }

  const reader = response.body?.getReader();
  if (reader === undefined) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      // Cancelling matters as much as the check: without it the connection stays open and the
      // remote end keeps sending, so the cap saves memory but not bandwidth or the slot.
      await reader.cancel();
      throw new FetchError(`Page is larger than ${String(MAX_BYTES)} bytes.`, response.url);
    }
    chunks.push(value);
  }

  return new TextDecoder('utf-8').decode(Buffer.concat(chunks, total));
};

/**
 * Fetch one URL, following redirects by hand so each destination is re-validated.
 *
 * Returns text for HTML-ish responses. Anything else — a PDF, an image, a JSON API — is
 * rejected rather than fed to the extractor, because a binary run through an HTML parser
 * produces a page of mojibake that embeds successfully and matches queries at random.
 */
export const fetchPage = async (
  startUrl: string,
  options: { timeoutMs?: number } = {},
): Promise<FetchedPage> => {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    // Re-checked on every hop, and again here even for the first, because DNS answers change
    // between registration and crawl — see the rebinding note in url-guard.ts.
    await assertCrawlableUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs ?? TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': CRAWLER_USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': '*',
        },
      });
    } catch (error) {
      throw new FetchError(
        controller.signal.aborted ? 'Timed out.' : `Could not connect: ${String(error)}`,
        url,
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location === null) throw new FetchError('Redirect without a location.', url);
      try {
        url = new URL(location, url).toString();
      } catch {
        throw new FetchError(`Redirect to an unusable location: ${location}`, url);
      }
      continue;
    }

    if (!response.ok) {
      throw new FetchError(`Server returned ${String(response.status)}.`, url);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!READABLE_TYPES.test(contentType)) {
      throw new FetchError(`Not a readable page (${contentType || 'unknown type'}).`, url);
    }

    return { url, status: response.status, contentType, body: await readCapped(response) };
  }

  throw new FetchError(`More than ${String(MAX_REDIRECTS)} redirects.`, startUrl);
};

/**
 * Fetch a site's robots.txt.
 *
 * Absence is permission. A 404 means the site has no rules, which is different from a 500 or a
 * timeout — but we treat those the same way and proceed, because refusing to crawl a site whose
 * robots.txt is briefly unavailable would make a merchant's onboarding fail for a reason they
 * cannot see and did not cause. The per-page rules still apply once it comes back.
 */
export const __testing = { READABLE_TYPES };

export const fetchRobots = async (origin: string): Promise<string | null> => {
  try {
    const page = await fetchPage(new URL('/robots.txt', origin).toString(), { timeoutMs: 5000 });
    return page.body;
  } catch {
    return null;
  }
};
