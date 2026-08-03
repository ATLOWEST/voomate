/**
 * HTML in, retrievable text out.
 *
 * This is the quality ceiling for the whole product. Retrieval cannot find what extraction
 * threw away, and the model cannot ignore boilerplate that extraction kept — a corpus where
 * every page begins with the same 200-word navigation menu produces chunks that all look
 * alike to a vector search, which is the single most common reason a RAG system returns
 * confident nonsense. Everything here is in service of one goal: keep what a human reading the
 * page would call the content, drop what they would call the furniture.
 *
 * Deliberately not a headless browser. Most merchant sites — Shopify, WooCommerce, Squarespace,
 * anything server-rendered — put their content in the HTML, and paying for a Chromium process
 * per page to find that out is a large cost for a small minority. Pages that *do* need
 * rendering are detected (`looksLikeAppShell`) rather than silently indexed as empty, so the
 * render pass can be added later for exactly the pages that need it.
 */
import * as cheerio from 'cheerio';
// Cheerio re-exports the node types only as part of its method signatures, so the tree types
// come from the parser it is built on. A direct dependency rather than a reach through
// cheerio's node_modules, which npm is free to rearrange.
import type { AnyNode } from 'domhandler';

export interface ExtractedPage {
  readonly title: string;
  readonly text: string;
  /** Absolute, same-document-resolved URLs found in anchors. Not yet filtered by host. */
  readonly links: readonly string[];
  /** From `<html lang>`, normalised to a BCP-47-ish tag. Null when the page does not say. */
  readonly language: string | null;
  /**
   * True when the page returned HTML but essentially no text — a client-rendered shell. The
   * distinction from "genuinely empty" matters: one is fixable by rendering, the other is not.
   */
  readonly looksLikeAppShell: boolean;
}

/**
 * Elements whose text is furniture on essentially every site.
 *
 * Tag and ARIA-role based only. Class-name heuristics ("remove anything matching /nav|menu/")
 * are tempting and wrong — plenty of sites put the real content in `<div class="menu">` because
 * they are a restaurant.
 */
const FURNITURE = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'object',
  'embed',
  'form',
  'button',
  'select',
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="search"]',
  '[aria-hidden="true"]',
  '[hidden]',
].join(',');

/** Containers that, when present, are the author telling us where the content is. */
const MAIN_CANDIDATES = ['main', '[role="main"]', 'article', '#content', '#main'];

const BLOCK = new Set([
  'p',
  'div',
  'section',
  'article',
  'ul',
  'ol',
  'dl',
  'dt',
  'dd',
  'table',
  'tr',
  'blockquote',
  'pre',
  'br',
  'hr',
  'figcaption',
  'address',
]);

const HEADING = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Depth-first text walk that preserves block structure.
 *
 * Cheerio's own `.text()` concatenates without separators, so `<li>Red</li><li>Blue</li>`
 * becomes "RedBlue" — which then chunks into a sentence that does not exist and embeds as
 * something no question will ever match. Headings are kept with `#` markers because the
 * chunker uses them as split points, so a heading that survives extraction is a chunk boundary
 * that lands where a human would put it.
 */
const walk = ($: cheerio.CheerioAPI, node: AnyNode, out: string[]): void => {
  if (node.type === 'text') {
    const value = node.data.replace(/\s+/g, ' ');
    if (value.trim().length > 0) out.push(value);
    return;
  }

  if (node.type !== 'tag') return;

  const tag = node.tagName.toLowerCase();

  if (HEADING.has(tag)) {
    const text = $(node).text().replace(/\s+/g, ' ').trim();
    if (text.length > 0) out.push(`\n\n${'#'.repeat(Number(tag[1]))} ${text}\n`);
    return;
  }

  if (tag === 'li') {
    const text = $(node).text().replace(/\s+/g, ' ').trim();
    if (text.length > 0) out.push(`\n- ${text}`);
    return;
  }

  if (tag === 'th' || tag === 'td') {
    const text = $(node).text().replace(/\s+/g, ' ').trim();
    if (text.length > 0) out.push(`${text} | `);
    return;
  }

  const isBlock = BLOCK.has(tag);
  if (isBlock) out.push('\n');

  for (const child of node.children) walk($, child, out);

  if (isBlock) out.push('\n');
};

/**
 * Question/answer pairs published as schema.org `FAQPage` structured data.
 *
 * Worth a special case because it is the highest-signal content on a support site and it is
 * frequently *only* in the JSON-LD — accordion FAQs render their answers with JavaScript, so
 * the visible HTML holds the questions and none of the answers. Extracting the plain text
 * alone would produce a page of questions with no answers, which is worse than useless: it
 * retrieves perfectly for a customer's question and then has nothing to say.
 */
const faqFromJsonLd = ($: cheerio.CheerioAPI): string[] => {
  const out: string[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (raw.length === 0 || raw.length > 500_000) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON-LD is extremely common and never worth failing a page over.
      return;
    }

    const visit = (value: unknown, depth: number): void => {
      if (depth > 6 || value === null || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        for (const item of value) visit(item, depth + 1);
        return;
      }

      const record = value as Record<string, unknown>;
      if (record['@type'] === 'Question') {
        const question = typeof record.name === 'string' ? record.name : null;
        const accepted = record.acceptedAnswer as Record<string, unknown> | undefined;
        const answer = typeof accepted?.text === 'string' ? accepted.text : null;
        if (question !== null && answer !== null) {
          out.push(`\n\n## ${question}\n${stripTags(answer)}`);
        }
      }

      for (const nested of Object.values(record)) visit(nested, depth + 1);
    };

    visit(parsed, 0);
  });

  return out;
};

/** Answer text inside JSON-LD is usually itself HTML. */
const stripTags = (value: string): string =>
  cheerio.load(`<div>${value}</div>`)('div').text().replace(/\s+/g, ' ').trim();

const tidy = (value: string): string =>
  value
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ \| \n/g, '\n')
    .trim();

export const extractPage = (html: string, pageUrl: string): ExtractedPage => {
  const $ = cheerio.load(html);

  // Links come first, before the furniture is stripped. Navigation is boilerplate to *read*
  // and the primary means of *discovery* — removing it and then looking for links is how a
  // crawler ends up seeing only the homepage.
  const links: string[] = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (href === undefined) return;
    try {
      const resolved = new URL(href, pageUrl);
      // The scheme check is the real filter, not the try/catch. `javascript:void(0)`,
      // `mailto:`, `tel:` and `data:` are all *valid* absolute URLs, so parsing them succeeds
      // and only the protocol tells them apart from a page.
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return;
      resolved.hash = '';
      links.push(resolved.toString());
    } catch {
      // Template placeholders like `href="{{url}}"`. Not links.
    }
  });

  const faq = faqFromJsonLd($);

  // Collapsed, not just trimmed: `<title>` is frequently written across several source lines,
  // and the raw newlines end up in citation labels in the dashboard and the widget.
  const collapse = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();

  const title =
    [
      collapse($('meta[property="og:title"]').attr('content')),
      collapse($('title').first().text()),
      collapse($('h1').first().text()),
    ].find((candidate) => candidate.length > 0) ?? '';

  const language = $('html').attr('lang')?.trim().toLowerCase() ?? null;

  // The description is often the only prose on a thin product page, and it is what the
  // merchant chose to say the page is about.
  const description =
    $('meta[name="description"]').attr('content')?.trim() ??
    $('meta[property="og:description"]').attr('content')?.trim() ??
    '';

  $(FURNITURE).remove();

  const root =
    MAIN_CANDIDATES.map((selector) => $(selector).first()).find(
      (found) => found.length > 0 && found.text().trim().length > 200,
    ) ?? $('body');

  const parts: string[] = [];
  for (const child of root.toArray()) walk($, child, parts);

  const body = tidy(parts.join(''));
  const text = tidy([description, body, ...faq].filter((part) => part.length > 0).join('\n\n'));

  return {
    title: title.length > 0 ? title.slice(0, 300) : new URL(pageUrl).pathname,
    text,
    links,
    language: language !== null && language.length > 0 ? language : null,
    // 200 characters is below any real page and above a "Loading…" placeholder. Anchored to
    // there being scripts on the page: a genuinely tiny static page is not an app shell.
    looksLikeAppShell: text.length < 200 && /<script/i.test(html),
  };
};
