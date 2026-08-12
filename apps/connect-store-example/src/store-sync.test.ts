import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncStoreProduct, type StoreProduct } from './store-sync.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('store public-field adapter', () => {
  it('sends only allowlisted public fields through the installed SDK', async () => {
    const product: StoreProduct = {
      id: 'mercury-care',
      public: {
        name: 'Mercury Care',
        description: 'Priority setup and glacier-blue replacement seals.',
        displayPrice: '$39',
        supportPlan: 'Renews every 19 months.',
        url: 'https://shop.example.test/products/mercury-care',
        tags: ['support'],
      },
      private: {
        costPrice: 7.25,
        marginPercent: 81,
        supplierToken: 'supplier_token_must_stay_private',
        internalNotes: 'Do not mention the wholesale contract.',
        lastCustomerEmail: 'private-customer@example.test',
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, items: [{ status: 'synced', chunks: 1 }] }), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      syncStoreProduct({
        tenantKey: 'sk_test_key_that_is_long_enough_for_validation',
        product,
        endpoint: 'https://api.example.test/v1/connect/sync',
      }),
    ).resolves.toMatchObject({ ok: true, status: 'synced' });

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = String(request.body);
    expect(body).toContain('Mercury Care');
    expect(body).toContain('Renews every 19 months');
    expect(body).not.toContain('7.25');
    expect(body).not.toContain('81');
    expect(body).not.toContain('supplier_token_must_stay_private');
    expect(body).not.toContain('wholesale contract');
    expect(body).not.toContain('private-customer@example.test');
  });
});
