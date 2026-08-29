import { describe, expect, it } from 'vitest';
import {
  webDeploymentPolicyFromAppearance,
  webDeploymentPolicySchema,
  webSurfaceForLocation,
} from './web-surface-policy.js';

describe('Web Agent surface policy', () => {
  const policy = webDeploymentPolicySchema.parse({
    version: 1,
    surfaces: [
      {
        id: 'marketing',
        name: 'Marketing pages',
        kind: 'marketing_site',
        origin: 'https://example.com',
        pathPrefixes: ['/'],
        enabled: true,
      },
      {
        id: 'merchant_dashboard',
        name: 'Merchant dashboard',
        kind: 'merchant_dashboard',
        origin: 'https://app.example.com',
        pathPrefixes: ['/orders'],
        enabled: true,
      },
    ],
  });

  it('matches an enabled origin and its configured page area', () => {
    expect(webSurfaceForLocation(policy, 'https://example.com', '/pricing')?.id).toBe('marketing');
    expect(webSurfaceForLocation(policy, 'https://app.example.com', '/orders/125')?.id).toBe(
      'merchant_dashboard',
    );
    expect(webSurfaceForLocation(policy, 'https://app.example.com', '/settings')).toBeUndefined();
  });

  it('allows a tenant-approved area even when its path is named admin', () => {
    const adminPolicy = webDeploymentPolicySchema.parse({
      version: 1,
      surfaces: [
        {
          id: 'operations',
          name: 'Operations console',
          kind: 'declared',
          origin: 'https://app.example.com',
          pathPrefixes: ['/admin'],
          enabled: true,
        },
      ],
    });
    expect(webSurfaceForLocation(adminPolicy, 'https://app.example.com', '/admin/agents')?.id).toBe(
      'operations',
    );
  });

  it('supports an explicit tenant-owned exclusion below a broad area', () => {
    const excluded = webDeploymentPolicySchema.parse({
      version: 1,
      surfaces: [
        {
          id: 'product',
          name: 'Product',
          kind: 'manual',
          origin: 'https://app.example.com',
          pathPrefixes: ['/'],
          excludedPathPrefixes: ['/billing'],
          enabled: true,
        },
      ],
    });
    expect(webSurfaceForLocation(excluded, 'https://app.example.com', '/orders')).toBeDefined();
    expect(
      webSurfaceForLocation(excluded, 'https://app.example.com', '/billing/invoices'),
    ).toBeUndefined();
  });

  it('disables one exact page without disabling its child routes', () => {
    const excluded = webDeploymentPolicySchema.parse({
      version: 1,
      surfaces: [
        {
          id: 'application',
          name: 'Customer application',
          kind: 'observed',
          origin: 'https://app.example.com',
          pathPrefixes: ['/'],
          excludedPaths: ['/agents'],
          enabled: true,
        },
      ],
    });

    expect(webSurfaceForLocation(excluded, 'https://app.example.com', '/agents')).toBeUndefined();
    expect(webSurfaceForLocation(excluded, 'https://app.example.com', '/agents/new')).toBeDefined();
  });

  it('keeps existing origin-only agents compatible on every path', () => {
    const legacy = webDeploymentPolicyFromAppearance({}, ['https://app.example.com']);
    expect(webSurfaceForLocation(legacy, 'https://app.example.com', '/overview')).toBeDefined();
    expect(webSurfaceForLocation(legacy, 'https://app.example.com', '/admin/health')).toBeDefined();
  });
});
