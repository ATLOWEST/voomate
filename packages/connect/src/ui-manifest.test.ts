import { describe, expect, it } from 'vitest';
import { defineUiManifest, serializeUiManifest } from './ui-manifest.js';

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

  it('serializes safely for an application/json script element', () => {
    const manifest = defineUiManifest({
      pages: [
        { id: 'about', title: 'About', path: '/about', description: 'Why <Voomate> exists.' },
      ],
    });
    expect(serializeUiManifest(manifest)).not.toContain('<');
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
