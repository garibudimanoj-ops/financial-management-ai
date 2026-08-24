import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireBusinessContext, requireRole, requirePermission, getUserBusinesses } from './auth';
import { prisma } from './prisma';
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
vi.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    businessMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Auth & Multi-Tenant Helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'mock-supabase-id', email: 'test@example.com', user_metadata: { name: 'Test User' } },
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
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: 'new-user-id',
      supabaseUserId: 'mock-supabase-id',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await requireAuth();
    expect(user.id).toBe('new-user-id');
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('should resolve business context for active member', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'mock-supabase-id',
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

  it('should throw FORBIDDEN AppError if membership status is not ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-123',
      supabaseUserId: 'mock-supabase-id',
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
      supabaseUserId: 'mock-supabase-id',
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
      supabaseUserId: 'mock-supabase-id',
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
      supabaseUserId: 'mock-supabase-id',
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
