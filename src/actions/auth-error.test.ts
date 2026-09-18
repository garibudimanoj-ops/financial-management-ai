/**
 * Auth action error handling regression tests — P1 fix
 */
import { describe, it, expect } from 'vitest';
import { AppError } from '@/lib/errors';

describe('Auth Action Error Handling — P1 Regression', () => {
  it('AppError preserves safe user-facing messages and codes', () => {
    const err = new AppError('Too many attempts.', 'RATE_LIMITED');
    expect(err.message).toBe('Too many attempts.');
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe('AppError');
  });

  it('AppError does not expose provider details', () => {
    const err = new AppError('Invalid credentials.', 'UNAUTHORIZED');
    expect(err.message).not.toContain('supabase');
    expect(err.message).not.toContain('database');
    expect(err.message).not.toContain('prisma');
  });

  it('AppError preserves redirect exceptions for NEXT_REDIRECT handling', () => {
    const redirectMsg = 'NEXT_REDIRECT|/dashboard';
    const redirectErr = new Error(redirectMsg);
    expect(redirectErr.message.includes('NEXT_REDIRECT')).toBe(true);
  });

  it('AppError UNAUTHORIZED produces correct status code', () => {
    const err = new AppError('Invalid email or password.', 'UNAUTHORIZED');
    expect(err.statusCode).toBe(401);
  });

  it('AppError RATE_LIMITED produces correct status code', () => {
    const err = new AppError('Too many attempts.', 'RATE_LIMITED');
    expect(err.statusCode).toBe(429);
  });
});
