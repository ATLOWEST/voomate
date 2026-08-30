import { describe, expect, it } from 'vitest';
import { installationChallengePath, normalizeInstallationRoutes } from './installation.js';

describe('Web Agent installation contract', () => {
  it('uses an agent-specific well-known challenge path', () => {
    expect(installationChallengePath('sq_agent_public_123')).toBe(
      '/.well-known/voomate/sq_agent_public_123.txt',
    );
  });

  it('keeps only unique safe path-only route evidence', () => {
    expect(
      normalizeInstallationRoutes([
        { pathname: '/agents/', name: 'Agents', source: 'navigation' },
        { pathname: '/agents', name: 'Duplicate', source: 'current' },
        { pathname: '/settings//profile', source: 'manifest' },
        { pathname: '/../private', source: 'manifest' },
      ]),
    ).toEqual([
      { pathname: '/agents', name: 'Agents', source: 'navigation' },
      { pathname: '/settings/profile', source: 'manifest' },
    ]);
  });
});
