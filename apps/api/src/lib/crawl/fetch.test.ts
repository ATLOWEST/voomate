import { describe, expect, it } from 'vitest';
import { __testing } from './fetch.js';

const { READABLE_TYPES } = __testing;

describe('readable content types', () => {
  it.each([
    'text/html',
    'text/html; charset=utf-8',
    'TEXT/HTML',
    'application/xhtml+xml',
    'text/plain',
    'text/xml',
    // The regression: most servers send this for sitemap.xml, and rejecting it made the
    // crawler silently fall back to link-following on nearly every real site.
    'application/xml',
    'application/xml; charset=UTF-8',
    'application/rss+xml',
  ])('accepts %s', (value) => {
    expect(READABLE_TYPES.test(value)).toBe(true);
  });

  it.each([
    'application/pdf',
    'image/png',
    'application/json',
    'application/octet-stream',
    'video/mp4',
    '',
  ])('rejects %s', (value) => {
    expect(READABLE_TYPES.test(value)).toBe(false);
  });

  it('does not match a readable type appearing later in the header', () => {
    // Anchored on purpose: a substring match would accept `application/octet-stream;
    // fallback=text/html` and hand a binary to the HTML parser.
    expect(READABLE_TYPES.test('application/octet-stream; note=text/html')).toBe(false);
  });
});
