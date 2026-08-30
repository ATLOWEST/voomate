import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './redirect';

describe('safeInternalPath', () => {
  it('accepts an application-relative path', () => {
    expect(safeInternalPath('/agents?tab=active')).toBe('/agents?tab=active');
  });

  it.each([
    undefined,
    null,
    '',
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker.example',
  ])('falls back for unsafe path %j', (value) => {
    expect(safeInternalPath(value)).toBe('/agents');
  });
});
