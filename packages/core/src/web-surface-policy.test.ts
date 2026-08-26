import { describe, expect, it } from 'vitest';
import {
  isProtectedWebAgentPath,
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

  it('structurally excludes the Super Admin portal even on an allowed origin', () => {
    expect(isProtectedWebAgentPath('/admin')).toBe(true);
    expect(isProtectedWebAgentPath('/admin/agents')).toBe(true);
    expect(webSurfaceForLocation(policy, 'https://app.example.com', '/admin/agents')).toBeUndefined();
  });

  it('keeps existing origin-only agents compatible while preserving the admin exclusion', () => {
    const legacy = webDeploymentPolicyFromAppearance({}, ['https://app.example.com']);
    expect(webSurfaceForLocation(legacy, 'https://app.example.com', '/overview')).toBeDefined();
    expect(webSurfaceForLocation(legacy, 'https://app.example.com', '/admin/health')).toBeUndefined();
  });
});
