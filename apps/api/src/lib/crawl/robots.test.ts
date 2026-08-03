import { describe, expect, it } from 'vitest';
import { isAllowed, parseRobots, USER_AGENT_TOKEN, __testing } from './robots.js';

const { matches } = __testing;

describe('parseRobots', () => {
  it('reads the wildcard group when there is no rule for us', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /admin\n');
    expect(rules.disallow).toEqual(['/admin']);
  });

  it('prefers a group naming us over the wildcard', () => {
    const rules = parseRobots(
      `User-agent: *\nDisallow: /\n\nUser-agent: ${USER_AGENT_TOKEN}\nDisallow: /cart\n`,
    );
    // Reading the wildcard here would crawl nothing at all on a site that explicitly
    // welcomed us.
    expect(rules.disallow).toEqual(['/cart']);
  });

  it('shares one group between consecutive user-agent lines', () => {
    const rules = parseRobots(
      `User-agent: googlebot\nUser-agent: ${USER_AGENT_TOKEN}\nDisallow: /x\n`,
    );
    expect(rules.disallow).toEqual(['/x']);
  });

  it('starts a new group when an agent line follows a rule', () => {
    const rules = parseRobots(
      `User-agent: googlebot\nDisallow: /g\n\nUser-agent: ${USER_AGENT_TOKEN}\nDisallow: /s\n`,
    );
    expect(rules.disallow).toEqual(['/s']);
  });

  it('treats an empty Disallow as permission, not as a rule matching everything', () => {
    const rules = parseRobots('User-agent: *\nDisallow:\n');
    expect(rules.disallow).toEqual([]);
    expect(isAllowed(rules, '/anything')).toBe(true);
  });

  it('collects sitemaps regardless of which group they sit in', () => {
    const rules = parseRobots(
      'Sitemap: https://a.example/sitemap.xml\nUser-agent: *\nSitemap: https://b.example/s.xml\n',
    );
    expect(rules.sitemaps).toEqual(['https://a.example/sitemap.xml', 'https://b.example/s.xml']);
  });

  it('reads crawl-delay in seconds and caps it', () => {
    expect(parseRobots('User-agent: *\nCrawl-delay: 2\n').crawlDelayMs).toBe(2000);
    expect(parseRobots('User-agent: *\nCrawl-delay: 9999\n').crawlDelayMs).toBe(30_000);
  });

  it('ignores inline comments', () => {
    const rules = parseRobots('User-agent: * # everyone\nDisallow: /admin # private\n');
    expect(rules.disallow).toEqual(['/admin']);
  });

  it('is case-insensitive about field names', () => {
    const rules = parseRobots('USER-AGENT: *\nDISALLOW: /a\n');
    expect(rules.disallow).toEqual(['/a']);
  });

  it('allows everything when the file mentions no group we belong to', () => {
    const rules = parseRobots('User-agent: googlebot\nDisallow: /\n');
    expect(isAllowed(rules, '/anything')).toBe(true);
  });
});

describe('matches', () => {
  it('is a prefix match by default', () => {
    expect(matches('/blog', '/blog/post-1')).toBe(true);
    expect(matches('/blog', '/news')).toBe(false);
  });

  it('supports * as any run of characters', () => {
    expect(matches('/*.php', '/index.php')).toBe(true);
    expect(matches('/a/*/c', '/a/b/c')).toBe(true);
  });

  it('anchors with $', () => {
    expect(matches('/page$', '/page')).toBe(true);
    expect(matches('/page$', '/page/sub')).toBe(false);
  });

  it('treats regex metacharacters in the pattern literally', () => {
    // Without escaping, `.` matches any character and this would wrongly match /aXb.
    expect(matches('/a.b', '/aXb')).toBe(false);
    expect(matches('/a.b', '/a.b')).toBe(true);
  });
});

describe('isAllowed', () => {
  it('lets the longest match win', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /\nAllow: /products/\n');
    expect(isAllowed(rules, '/products/hat')).toBe(true);
    expect(isAllowed(rules, '/checkout')).toBe(false);
  });

  it('lets Allow win an equal-length tie', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /a\nAllow: /a\n');
    expect(isAllowed(rules, '/a')).toBe(true);
  });

  it('matches against the query string too', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /*?print=\n');
    expect(isAllowed(rules, '/page?print=true')).toBe(false);
    expect(isAllowed(rules, '/page')).toBe(true);
  });
});
