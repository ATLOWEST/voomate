/**
 * robots.txt parsing and rule matching.
 *
 * Obeying robots.txt is not optional politeness here. Soniq crawls a merchant's site on the
 * merchant's instruction, but it crawls it from our IP range at our reputation — one customer
 * pointing us at a site with an aggressive WAF and no rate limit gets *every* customer's crawl
 * blocked. The file is also the cheapest possible signal about which paths are worth reading:
 * `/cart`, `/checkout`, `/search?q=` are disallowed on most shops precisely because they are
 * infinite and contentless, which is exactly what we want to skip anyway.
 *
 * Pure functions, no network. `fetchRobots` in fetch.ts does the retrieval.
 */

/** The rules that apply to one user-agent, already narrowed from the whole file. */
export interface RobotsRules {
  readonly allow: readonly string[];
  readonly disallow: readonly string[];
  /** From `Crawl-delay`. Null when unspecified — the caller applies its own default. */
  readonly crawlDelayMs: number | null;
  /** Absolute URLs from `Sitemap:` directives. Global to the file, not per-agent. */
  readonly sitemaps: readonly string[];
}

export const ALLOW_ALL: RobotsRules = {
  allow: [],
  disallow: [],
  crawlDelayMs: null,
  sitemaps: [],
};

/** Our token, matched case-insensitively against `User-agent` lines. */
export const USER_AGENT_TOKEN = 'soniqbot';

/**
 * Narrow a robots.txt to the rules governing one user-agent.
 *
 * Groups are keyed by the `User-agent` lines preceding them, and consecutive `User-agent` lines
 * with no rules between them share the group that follows. A named match beats `*`, which is
 * the whole point of publishing a token: a site owner who wants to give us different rules from
 * the generic bot crowd can, and we must honour that rather than reading `*` regardless.
 */
export const parseRobots = (text: string, userAgent = USER_AGENT_TOKEN): RobotsRules => {
  const token = userAgent.toLowerCase();

  const groups = new Map<string, { allow: string[]; disallow: string[]; delay: number | null }>();
  const sitemaps: string[] = [];

  let active: string[] = [];
  // Consecutive `User-agent` lines accumulate; the first rule line closes the header and any
  // further agent line after that starts a new group.
  let collectingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    // Comments may be inline, not just whole-line.
    const line = rawLine.split('#')[0]!.trim();
    if (line.length === 0) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'sitemap') {
      if (value.length > 0) sitemaps.push(value);
      continue;
    }

    if (field === 'user-agent') {
      if (!collectingAgents) {
        active = [];
        collectingAgents = true;
      }
      active.push(value.toLowerCase());
      for (const agent of active) {
        if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [], delay: null });
      }
      continue;
    }

    if (active.length === 0) continue;
    collectingAgents = false;

    for (const agent of active) {
      const group = groups.get(agent)!;
      if (field === 'allow' && value.length > 0) group.allow.push(value);
      else if (field === 'disallow') {
        // `Disallow:` with an empty value means "allow everything" and must not be stored as a
        // rule — as a prefix, the empty string matches every path.
        if (value.length > 0) group.disallow.push(value);
      } else if (field === 'crawl-delay') {
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds >= 0) group.delay = Math.min(seconds, 30) * 1000;
      }
    }
  }

  const group = groups.get(token) ?? groups.get('*');
  if (group === undefined) return { ...ALLOW_ALL, sitemaps };

  return {
    allow: group.allow,
    disallow: group.disallow,
    crawlDelayMs: group.delay,
    sitemaps,
  };
};

/**
 * Does a robots path pattern match this path?
 *
 * Patterns are prefix matches with two extensions everyone implements: `*` for any run of
 * characters and `$` to anchor the end. Built as a regex rather than by hand because the
 * alternative — a character-by-character matcher with backtracking — is where the subtle bugs
 * live, and a wrong answer here means crawling something we were told not to.
 */
const matches = (pattern: string, path: string): boolean => {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;

  const source = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');

  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path);
};

/**
 * May we fetch this path?
 *
 * The rule is longest-match-wins, with Allow beating Disallow on an equal-length tie. That tie
 * break is what makes the common `Disallow: /` + `Allow: /products/` pattern work; resolving it
 * the other way round would make us skip the only pages the site actually wanted indexed.
 */
export const isAllowed = (rules: RobotsRules, pathWithQuery: string): boolean => {
  let bestAllow = -1;
  let bestDisallow = -1;

  for (const pattern of rules.allow) {
    if (matches(pattern, pathWithQuery)) bestAllow = Math.max(bestAllow, pattern.length);
  }
  for (const pattern of rules.disallow) {
    if (matches(pattern, pathWithQuery)) bestDisallow = Math.max(bestDisallow, pattern.length);
  }

  if (bestDisallow === -1) return true;
  return bestAllow >= bestDisallow;
};

export const __testing = { matches };
