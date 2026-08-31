import { describe, expect, it } from 'vitest';
import { defineUiManifest, matchUiPagePath, serializeUiManifest } from './ui-manifest.js';

describe('Voomate UI manifest', () => {
  it('exposes only frozen, passive, same-origin page descriptions', () => {
    const manifest = defineUiManifest({
      businessSummary: 'A scheduling product for independent teams.',
      pages: [
        {
          id: 'appointments',
          title: 'Appointments',
          path: '/appointments',
          description: 'View upcoming appointments.',
          aliases: ['calendar', 'bookings', 'Calendar'],
          facts: ['Appointments can be filtered by date.'],
        },
      ],
    });
    expect(manifest).toMatchObject({
      version: 1,
      pages: [
        {
          path: '/appointments',
          aliases: ['calendar', 'bookings'],
          facts: ['Appointments can be filtered by date.'],
        },
      ],
    });
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.pages)).toBe(true);
    expect(Object.isFrozen(manifest.pages[0]?.facts)).toBe(true);
    expect(Object.isFrozen(manifest.pages[0]?.aliases)).toBe(true);
  });

  it('cannot declare cross-origin routes or write operations', () => {
    expect(() =>
      defineUiManifest({
        pages: [
          {
            id: 'unsafe',
            title: 'Unsafe',
            path: 'https://evil.example/write',
            description: 'Do something unsafe.',
          },
        ],
      }),
    ).toThrow('same-origin');
    expect(() =>
      defineUiManifest({
        pages: [
          {
            id: 'write',
            title: 'Write',
            path: '/write',
            description: 'Write data.',
            operation: 'write',
          } as never,
        ],
      }),
    ).toThrow('cannot declare commands');
  });

  it('allows an explicit HTTPS dashboard handoff while keeping it passive', () => {
    const manifest = defineUiManifest({
      pages: [{ id: 'home', title: 'Home', path: '/', description: 'Public site.' }],
      trustedDestinations: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          url: 'https://app.example.com/',
          description: 'Sign in to manage the workspace.',
          aliases: ['workspace', 'account portal'],
        },
      ],
    });
    expect(manifest.trustedDestinations?.[0]).toMatchObject({
      title: 'Dashboard',
      url: 'https://app.example.com/',
      aliases: ['workspace', 'account portal'],
    });
    expect(Object.isFrozen(manifest.trustedDestinations)).toBe(true);
    expect(() =>
      defineUiManifest({
        pages: [{ id: 'home', title: 'Home', path: '/', description: 'Public site.' }],
        trustedDestinations: [
          {
            id: 'unsafe',
            title: 'Unsafe',
            url: 'http://example.com/',
            description: 'Unsafe destination.',
          },
        ],
      }),
    ).toThrow('HTTPS');
  });

  it('serializes safely for an application/json script element', () => {
    const manifest = defineUiManifest({
      pages: [
        { id: 'about', title: 'About', path: '/about', description: 'Why <Voomate> exists.' },
      ],
    });
    expect(serializeUiManifest(manifest)).not.toContain('<');
  });

  it('recognizes dynamic declared pages without reading query strings or page source', () => {
    const manifest = defineUiManifest({
      pages: [
        { id: 'home', title: 'Home', path: '/', description: 'Public home.' },
        {
          id: 'product',
          title: 'Product',
          path: '/products',
          pathPatterns: ['/products/:handle'],
          description: 'A public product detail page.',
        },
        {
          id: 'order',
          title: 'Order tracking',
          path: '/orders',
          pathPatterns: ['/orders/:orderId'],
          description: 'A customer order tracking page.',
        },
      ],
    });
    expect(matchUiPagePath(manifest, '/products/linen-shirt')).toMatchObject({ id: 'product' });
    expect(matchUiPagePath(manifest, '/orders/A-100?email=private@example.com')).toMatchObject({
      id: 'order',
    });
    expect(matchUiPagePath(manifest, '/products/linen-shirt/reviews')).toBeUndefined();
    expect(() =>
      defineUiManifest({
        pages: [
          {
            id: 'unsafe',
            title: 'Unsafe',
            path: '/',
            pathPatterns: ['/products/*/reviews'],
            description: 'Invalid wildcard pattern.',
          },
        ],
      }),
    ).toThrow('wildcard');
  });

  it('accepts HTTPS app links and only official mobile stores', () => {
    const manifest = defineUiManifest({
      pages: [
        {
          id: 'pricing',
          title: 'Pricing',
          path: '/pricing',
          description: 'Compare plans.',
          native: {
            ios: {
              url: 'https://app.example/pricing',
              storeUrl: 'https://apps.apple.com/app/id123456789',
            },
            android: {
              url: 'https://app.example/pricing',
              storeUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
            },
          },
        },
      ],
    });
    expect(manifest.pages[0]?.native?.ios?.storeUrl).toContain('apps.apple.com');
    expect(() =>
      defineUiManifest({
        pages: [
          {
            id: 'unsafe-store',
            title: 'Unsafe',
            path: '/unsafe',
            description: 'Unsafe destination.',
            native: {
              ios: {
                url: 'myapp://unsafe',
                storeUrl: 'https://evil.example/fake-store',
              },
            },
          },
        ],
      }),
    ).toThrow();
  });
});
