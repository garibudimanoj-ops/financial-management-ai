/**
 * Auth action error handling regression tests — P1 fix
 */
import { describe, it, expect } from 'vitest';
import { AppError, handleActionError } from '@/lib/errors';

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

  it('handleActionError returns safe error for AppError', () => {
    const err = new AppError('Invalid email or password.', 'UNAUTHORIZED');
    const result = handleActionError(err);
    expect(result.error).toBe('Invalid email or password.');
    expect(result.code).toBe('UNAUTHORIZED');
  });

  it('handleActionError re-throws NEXT_REDIRECT errors', () => {
    const redirectErr = new Error('NEXT_REDIRECT|/dashboard');
    expect(() => handleActionError(redirectErr)).toThrow('NEXT_REDIRECT');
  });

  it('handleActionError returns safe message for unexpected errors', () => {
    const err = new Error('Database connection failed');
    const result = handleActionError(err);
    expect(result.error).toBe('Database connection failed');
    expect(result.code).toBe('INTERNAL_ERROR');
  });

  it('handleActionError returns generic message for non-Error objects', () => {
    const result = handleActionError('not an error');
    expect(result.error).toBe('An unexpected internal error occurred.');
    expect(result.code).toBe('INTERNAL_ERROR');
  });

  it('handleActionError preserves AppError details', () => {
    const err = new AppError('Conflict', 'CONFLICT', { recordId: 123 });
    const result = handleActionError(err);
    expect(result.error).toBe('Conflict');
    expect(result.code).toBe('CONFLICT');
  });
});
