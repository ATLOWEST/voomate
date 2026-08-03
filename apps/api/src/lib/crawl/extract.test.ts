import { describe, expect, it } from 'vitest';
import { extractPage } from './extract.js';
import { normalizeUrl } from './crawl.js';

const page = (body: string, head = ''): string =>
  `<!doctype html><html lang="en-GB"><head><title>Acme Returns</title>${head}</head><body>${body}</body></html>`;

describe('extractPage', () => {
  it('keeps the content and drops the furniture', () => {
    const html = page(`
      <nav><a href="/a">Shop</a><a href="/b">About</a></nav>
      <header>Free delivery over 50</header>
      <main><p>You have 30 days to return an item.</p></main>
      <footer>Copyright Acme</footer>
    `);
    const result = extractPage(html, 'https://acme.example/returns');

    expect(result.text).toContain('30 days to return');
    expect(result.text).not.toContain('Copyright Acme');
    expect(result.text).not.toContain('Free delivery over 50');
  });

  it('finds links in the navigation it removed from the text', () => {
    // The regression this guards: strip nav first, then look for links, and the crawl never
    // leaves the homepage.
    const html = page('<nav><a href="/products">Products</a></nav><main><p>Hello</p></main>');
    const result = extractPage(html, 'https://acme.example/');
    expect(result.links).toContain('https://acme.example/products');
  });

  it('resolves relative links against the page URL', () => {
    const html = page('<a href="../sizing">Sizing</a>');
    const result = extractPage(html, 'https://acme.example/help/returns');
    expect(result.links).toContain('https://acme.example/sizing');
  });

  it('drops the fragment so one page is not crawled once per anchor', () => {
    const html = page('<a href="/faq#shipping">Shipping</a><a href="/faq#returns">Returns</a>');
    const result = extractPage(html, 'https://acme.example/');
    expect(new Set(result.links)).toEqual(new Set(['https://acme.example/faq']));
  });

  it('ignores hrefs that are not links', () => {
    const html = page('<a href="javascript:void(0)">x</a><a href="mailto:a@b.c">mail</a>');
    const result = extractPage(html, 'https://acme.example/');
    expect(result.links.every((link) => link.startsWith('http'))).toBe(true);
  });

  it('separates list items instead of running them together', () => {
    const html = page('<main><ul><li>Red</li><li>Blue</li></ul></main>');
    const result = extractPage(html, 'https://acme.example/');
    expect(result.text).not.toContain('RedBlue');
    expect(result.text).toContain('Red');
    expect(result.text).toContain('Blue');
  });

  it('keeps headings as chunk boundaries', () => {
    const html = page('<main><h2>Refunds</h2><p>Within five days.</p></main>');
    const result = extractPage(html, 'https://acme.example/');
    expect(result.text).toContain('## Refunds');
  });

  it('reads the title and language', () => {
    const result = extractPage(page('<main><p>x</p></main>'), 'https://acme.example/');
    expect(result.title).toBe('Acme Returns');
    expect(result.language).toBe('en-gb');
  });

  it('pulls FAQ answers out of JSON-LD when the page only renders the questions', () => {
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do you ship to Ireland?',
          acceptedAnswer: { '@type': 'Answer', text: '<p>Yes, in 3 to 5 days.</p>' },
        },
      ],
    });
    const html = page(
      '<main><h2>Do you ship to Ireland?</h2></main>',
      `<script type="application/ld+json">${jsonLd}</script>`,
    );
    const result = extractPage(html, 'https://acme.example/faq');
    expect(result.text).toContain('Yes, in 3 to 5 days.');
  });

  it('survives malformed JSON-LD', () => {
    const html = page(
      '<main><p>Real content here.</p></main>',
      '<script type="application/ld+json">{ nope</script>',
    );
    expect(() => extractPage(html, 'https://acme.example/')).not.toThrow();
  });

  it('flags a client-rendered shell rather than reporting an empty page', () => {
    const html = page('<div id="root"></div>', '<script src="/app.js"></script>');
    const result = extractPage(html, 'https://acme.example/');
    expect(result.looksLikeAppShell).toBe(true);
  });

  it('does not flag a small static page as a shell', () => {
    const result = extractPage(page('<p>Short but real.</p>'), 'https://acme.example/');
    expect(result.looksLikeAppShell).toBe(false);
  });

  it('falls back to the meta description on a thin page', () => {
    const html = page(
      '<main><p>Buy now</p></main>',
      '<meta name="description" content="Waterproof walking boots, sizes 3 to 14.">',
    );
    const result = extractPage(html, 'https://acme.example/boots');
    expect(result.text).toContain('Waterproof walking boots');
  });
});

describe('normalizeUrl', () => {
  it('strips campaign parameters that identify a visit, not a page', () => {
    expect(normalizeUrl('https://a.example/p?utm_source=fb&colour=red')).toBe(
      'https://a.example/p?colour=red',
    );
  });

  it('sorts the surviving parameters so one page has one spelling', () => {
    expect(normalizeUrl('https://a.example/p?b=2&a=1')).toBe(
      normalizeUrl('https://a.example/p?a=1&b=2'),
    );
  });

  it('removes a trailing slash', () => {
    expect(normalizeUrl('https://a.example/about/')).toBe('https://a.example/about');
  });

  it('keeps the root path', () => {
    expect(normalizeUrl('https://a.example/')).toBe('https://a.example/');
  });

  it('drops the fragment and the default port', () => {
    expect(normalizeUrl('https://a.example:443/x#top')).toBe('https://a.example/x');
  });

  it('lowercases the host but not the path', () => {
    expect(normalizeUrl('https://A.Example/Path')).toBe('https://a.example/Path');
  });

  it('refuses non-http schemes', () => {
    expect(normalizeUrl('mailto:a@b.c')).toBeNull();
    expect(normalizeUrl('not a url')).toBeNull();
  });

  it('strips embedded credentials', () => {
    expect(normalizeUrl('https://user:pass@a.example/x')).toBe('https://a.example/x');
  });
});
