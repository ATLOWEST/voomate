import { describe, expect, it } from 'vitest';
import { connectSyncRequestSchema } from './schemas.js';

const item = {
  type: 'policy',
  id: 'returns/current',
  content: 'Returns are accepted for 21 days.',
  metadata: { title: 'Returns policy', tags: ['returns'] },
};

describe('Connect sync payload', () => {
  it('normalizes a single item into the batch processing shape', () => {
    expect(connectSyncRequestSchema.parse(item)).toEqual([item]);
  });

  it('accepts up to 100 heterogeneous items in one batch', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      ...item,
      type: index % 2 === 0 ? 'product' : 'faq',
      id: `item-${String(index)}`,
    }));
    expect(connectSyncRequestSchema.parse({ items })).toHaveLength(100);
  });

  it.each([
    { ...item, content: '   ' },
    { ...item, id: '../../bad id' },
    { ...item, type: 'not a slug' },
    { ...item, metadata: { sourceUrl: 'file:///etc/passwd' } },
    { ...item, metadata: { title: 'Returns policy', internalNotes: 'never store me' } },
    { ...item, content: 'Database: postgres://admin:password@db.example.test/app' },
    { ...item, content: 'api_key=abcdefghijklmnopqrstuvwx' },
    { items: Array.from({ length: 101 }, (_, index) => ({ ...item, id: `i-${index}` })) },
  ])('rejects malformed or abusive input cleanly', (payload) => {
    expect(() => connectSyncRequestSchema.parse(payload)).toThrow();
  });

  it('allows public business contact details without treating them as credentials', () => {
    expect(
      connectSyncRequestSchema.parse({
        ...item,
        content: 'Contact support@example.com or +1 555 010 1000 for help.',
      }),
    ).toHaveLength(1);
  });

  it('rejects credentials in the JSON body instead of accidentally storing them', () => {
    expect(() =>
      connectSyncRequestSchema.parse({ ...item, tenantKey: 'sk_should_be_in_a_header' }),
    ).toThrow();
  });
});
