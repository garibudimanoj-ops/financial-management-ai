import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signup } from './auth';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  syncPrismaUser: vi.fn(),
  logAuditEvent: vi.fn(),
  checkRateLimitShared: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signUp: mocks.signUp } }),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { businessMember: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/auth', () => ({
  syncPrismaUser: (...args: unknown[]) => mocks.syncPrismaUser(...args),
}));
vi.mock('@/lib/audit', () => ({
  logAuditEvent: (...args: unknown[]) => mocks.logAuditEvent(...args),
}));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitShared: (...args: unknown[]) => mocks.checkRateLimitShared(...args),
}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => mocks.redirect(path),
}));

describe('signup action', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.checkRateLimitShared.mockResolvedValue(true);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it('does not create or link a local user before email confirmation', async () => {
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: 'supabase-user', email: 'new@example.com' },
        session: null,
      },
      error: null,
    });

    await expect(signup({
      email: 'new@example.com',
      password: 'password123',
    })).rejects.toThrow('NEXT_REDIRECT:/login?message=check-email');

    expect(mocks.syncPrismaUser).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});
