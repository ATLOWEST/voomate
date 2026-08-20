import { describe, expect, it } from 'vitest';
import { parseServerEnv } from './env';

describe('production server environment', () => {
  it('rejects production without a shared rate-limit store', () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: 'production',
        API_CORS_ORIGINS: 'https://app.example.com',
      }),
    ).toThrow('Upstash Redis');
  });

  it('rejects insecure CORS origins in production', () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: 'production',
        API_CORS_ORIGINS: 'http://app.example.com',
        UPSTASH_REDIS_REST_URL: 'https://secure-cache.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
      }),
    ).toThrow('HTTPS origins');
  });

  it('accepts an explicit HTTPS and distributed-rate-limit production contract', () => {
    expect(
      parseServerEnv({
        NODE_ENV: 'production',
        API_CORS_ORIGINS: 'https://app.example.com,https://api.example.com',
        UPSTASH_REDIS_REST_URL: 'https://secure-cache.example.com',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      API_CORS_ORIGINS: ['https://app.example.com', 'https://api.example.com'],
    });
  });
});
