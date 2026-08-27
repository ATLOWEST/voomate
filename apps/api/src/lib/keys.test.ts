import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey } from './keys.js';

describe('API key generation', () => {
  it('creates a fresh 256-bit secret on every request', () => {
    const first = generateApiKey();
    const second = generateApiKey();

    expect(first.key).toMatch(/^sk_[A-Za-z0-9_-]{43}$/);
    expect(second.key).toMatch(/^sk_[A-Za-z0-9_-]{43}$/);
    expect(first.key).not.toBe(second.key);
    expect(first.hash).not.toBe(second.hash);
  });

  it('returns only a display prefix alongside the one-way hash', () => {
    const generated = generateApiKey();

    expect(generated.prefix).toBe(generated.key.slice(0, 11));
    expect(generated.hash).toBe(hashApiKey(generated.key));
    expect(generated.hash).not.toContain(generated.key);
  });
});
