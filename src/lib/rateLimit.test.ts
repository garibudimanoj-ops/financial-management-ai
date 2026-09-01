import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from './rateLimit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimit();
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
});
