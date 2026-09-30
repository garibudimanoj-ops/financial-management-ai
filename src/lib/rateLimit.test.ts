import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, checkRateLimitShared, getClientIp, resetRateLimit } from './rateLimit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should allow requests within limit and block when exceeded', () => {
    const key = 'test-ip-1';
    expect(checkRateLimit(key, 3, 60000)).toBe(true);
    expect(checkRateLimit(key, 3, 60000)).toBe(true);
    expect(checkRateLimit(key, 3, 60000)).toBe(true);
    // Exceeded limit (4th request)
    expect(checkRateLimit(key, 3, 60000)).toBe(false);
  });

  it('should reset limit after explicit reset', () => {
    const key = 'test-ip-2';
    checkRateLimit(key, 1, 60000);
    expect(checkRateLimit(key, 1, 60000)).toBe(false);
    resetRateLimit(key);
    expect(checkRateLimit(key, 1, 60000)).toBe(true);
  });

  it('fails closed in production when shared rate-limit credentials are missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    await expect(checkRateLimitShared('production-test')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('uses the Vercel-provided client address before other forwarded headers', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.12',
      'x-forwarded-for': '198.51.100.42',
    });
    expect(getClientIp(headers)).toBe('203.0.113.12');
  });

  it('does not trust an unverified X-Forwarded-For value', () => {
    expect(getClientIp(new Headers({
      'x-forwarded-for': '198.51.100.42',
    }))).toBe('unknown');
  });
});
