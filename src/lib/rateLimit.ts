import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { AppError } from '@/lib/errors';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const localRateLimitStore = new Map<string, RateLimitRecord>();
const limiters = new Map<string, Ratelimit>();
let redis: Redis | undefined;

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Process-local limiter used only in development and unit tests.
 * Production callers must use checkRateLimitShared.
 */
export function checkRateLimit(key: string, maxRequests = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const hashedKey = hashKey(key);
  const record = localRateLimitStore.get(hashedKey);

  if (localRateLimitStore.size > 5000) {
    for (const [storedKey, value] of localRateLimitStore.entries()) {
      if (now > value.resetTime) {
        localRateLimitStore.delete(storedKey);
      }
    }
  }

  if (!record || now > record.resetTime) {
    localRateLimitStore.set(hashedKey, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Enforces a shared sliding-window limit across serverless instances.
 * Local fallback is intentionally restricted to non-production environments.
 */
export async function checkRateLimitShared(
  key: string,
  maxRequests = 60,
  windowMs = 60000
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url && !token && process.env.NODE_ENV !== 'production') {
    return checkRateLimit(key, maxRequests, windowMs);
  }

  if (!url || !token) {
    throw new AppError(
      'Shared rate limiting is unavailable. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
      'INTERNAL_ERROR',
      503
    );
  }

  redis ??= new Redis({ url, token });

  const durationSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const limiterKey = `${maxRequests}:${durationSeconds}`;
  let limiter = limiters.get(limiterKey);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${durationSeconds} s`),
      prefix: 'financial-management-ai:rate-limit',
    });
    limiters.set(limiterKey, limiter);
  }

  try {
    const result = await limiter.limit(hashKey(key));
    return result.success;
  } catch (error) {
    console.error(
      '[Rate Limit] Shared store request failed',
      error instanceof Error ? error.name : 'unknown error'
    );
    throw new AppError('Shared rate limiting is unavailable', 'INTERNAL_ERROR', 503);
  }
}

export function getClientIp(headers: Headers): string {
  const candidate =
    headers.get('x-vercel-forwarded-for') ??
    headers.get('x-real-ip');
  const ip = candidate?.trim().split(',')[0];
  return ip && ip.length <= 64 && isIP(ip) ? ip : 'unknown';
}

/**
 * Resets local rate limit state for unit tests.
 */
export function resetRateLimit(key?: string) {
  if (key) {
    localRateLimitStore.delete(hashKey(key));
  } else {
    localRateLimitStore.clear();
  }
}
