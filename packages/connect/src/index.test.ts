import { afterEach, describe, expect, it, vi } from 'vitest';
import { sync } from './index.js';

const input = {
  tenantKey: 'sk_test_key_that_is_long_enough_for_validation',
  type: 'product',
  id: 'sku-1042',
  content: 'The Mercury plan renews every 17 months.',
  endpoint: 'https://api.example.test/v1/connect/sync',
  maxAttempts: 3,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('voomate.sync', () => {
  it('sends the secret only in Authorization and not in the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          items: [{ status: 'synced', chunks: 1, embeddingTokens: 14 }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(sync(input)).resolves.toMatchObject({ ok: true, status: 'synced' });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((request.headers as Record<string, string>).authorization).toBe(
      `Bearer ${input.tenantKey}`,
    );
    expect(String(request.body)).not.toContain(input.tenantKey);
    expect(request.redirect).toBe('error');
  });

  it('retries a transient response and then succeeds', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
      if (typeof callback === 'function') callback();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, items: [{ status: 'unchanged' }] }), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(sync(input)).resolves.toMatchObject({
      ok: true,
      status: 'unchanged',
      attempts: 2,
    });
  });

  it('never rejects when the network is unavailable and never logs the key', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
      if (typeof callback === 'function') callback();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(sync(input)).resolves.toMatchObject({
      ok: false,
      status: 'failed',
      attempts: 3,
      reason: 'network_error',
    });
    expect(warning.mock.calls.flat().join(' ')).not.toContain(input.tenantKey);
  });

  it('rejects malformed content locally without making a request or throwing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(sync({ ...input, content: '   ' })).resolves.toMatchObject({
      ok: false,
      reason: 'invalid_input',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects likely credentials locally without transmitting them', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      sync({ ...input, content: 'Database URL: postgres://admin:password@db.example.test/app' }),
    ).resolves.toMatchObject({ ok: false, reason: 'invalid_input' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires HTTPS except for explicit loopback development endpoints', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      sync({ ...input, endpoint: 'http://api.example.test/v1/connect/sync' }),
    ).resolves.toMatchObject({ ok: false, reason: 'invalid_input' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
