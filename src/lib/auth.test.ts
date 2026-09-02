import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireBusinessContext, requireRole, requirePermission, getUserBusinesses, syncPrismaUser } from './auth';
import { prisma } from '@/lib/prisma';
import { AppError } from './errors';

// Mock Supabase
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Mock Next Headers cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    business: {
      findUnique: vi.fn(),
    },
    businessMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('Auth & Multi-Tenant Helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'real-supabase-uuid-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
      },
      error: null,
    });
  });

  it('should throw UNAUTHORIZED AppError when no active session', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('No session'),
    });

    await expect(requireAuth()).rejects.toThrow(AppError);
    await expect(requireAuth()).rejects.toThrow('Unauthorized: No active session');
  });

  it('should auto-create application user if user exists in Supabase but not in Prisma', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: 'new-user-id',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await requireAuth();
    expect(user.id).toBe('new-user-id');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        supabaseUserId: 'real-supabase-uuid-123',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });

  it('should link existing Prisma user by email and update supabaseUserId when real Supabase UUID differs', async () => {
    // 1st lookup by supabaseUserId -> returns null (placeholder UUID in seed was sub-admin-demo-uuid)
    // 2nd lookup by email -> returns existing user record
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'existing-admin-id',
        supabaseUserId: 'sub-admin-demo-uuid',
        email: 'admin@apexglobal.demo',
        name: 'Priya Sharma (Principal CA)',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      id: 'existing-admin-id',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'admin@apexglobal.demo',
      name: 'Priya Sharma (Principal CA)',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const synced = await syncPrismaUser({
      id: 'real-supabase-uuid-123',
      email: 'admin@apexglobal.demo',
      user_metadata: { name: 'Priya Sharma (Principal CA)' },
    });

    expect(synced.id).toBe('existing-admin-id');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'existing-admin-id' },
      data: {
        supabaseUserId: 'real-supabase-uuid-123',
        name: 'Priya Sharma (Principal CA)',
      },
    });
  });

  it('should resolve business context for active member', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'membership-123',
      businessId: 'biz-123',
      userId: 'user-123',
      role: 'STAFF',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const context = await requireBusinessContext('biz-123');

    expect(context.userId).toBe('user-123');
    expect(context.businessId).toBe('biz-123');
    expect(context.role).toBe('STAFF');
    expect(context.membershipStatus).toBe('ACTIVE');
  });

  it('should strictly reject access when user attempts to access a business where they have no membership (tenant isolation)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-attacker',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'attacker@example.com',
      name: 'Attacker User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Attacker has membership only in biz-victim-2, but requests biz-target-1
    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue(null);

    await expect(requireBusinessContext('biz-target-1')).rejects.toThrow(
      'Forbidden: User is not an active member of this business'
    );
  });

  it('should throw FORBIDDEN AppError if membership status is not ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'membership-123',
      businessId: 'biz-123',
      userId: 'user-123',
      role: 'STAFF',
      status: 'SUSPENDED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(requireBusinessContext('biz-123')).rejects.toThrow(
      'Forbidden: User is not an active member of this business'
    );
  });

  it('should enforce role restrictions via requireRole', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'membership-123',
      businessId: 'biz-123',
      userId: 'user-123',
      role: 'STAFF',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Staff allowed for STAFF
    const ctx = await requireRole('biz-123', ['STAFF', 'ADMIN', 'OWNER']);
    expect(ctx.role).toBe('STAFF');

    // Staff rejected for OWNER / ADMIN only
    await expect(requireRole('biz-123', ['OWNER', 'ADMIN'])).rejects.toThrow(
      "Forbidden: Role 'STAFF' is not authorized for this action"
    );
  });

  it('should enforce permissions via requirePermission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.businessMember.findUnique).mockResolvedValue({
      id: 'membership-123',
      businessId: 'biz-123',
      userId: 'user-123',
      role: 'STAFF',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Staff has PRODUCT_READ
    const okCtx = await requirePermission('biz-123', 'PRODUCT_READ');
    expect(okCtx.businessId).toBe('biz-123');

    // Staff lacks PROFIT_READ
    await expect(requirePermission('biz-123', 'PROFIT_READ')).rejects.toThrow(
      'Forbidden: Insufficient permissions (PROFIT_READ)'
    );
  });

  it('should return active user businesses via getUserBusinesses', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'real-supabase-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.businessMember.findMany).mockResolvedValue([
      {
        id: 'mem-1',
        businessId: 'biz-1',
        userId: 'user-123',
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        business: {
          id: 'biz-1',
          name: 'Store A',
          baseCurrency: 'INR',
          city: 'Mumbai',
          country: 'India',
        },
      },
    ] as any);

    const result = await getUserBusinesses();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Store A');
    expect(result[0].role).toBe('OWNER');
  });
});
