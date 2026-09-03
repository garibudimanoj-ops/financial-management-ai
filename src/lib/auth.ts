import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { User, Role } from '@prisma/client';
import { Permission, hasPermission } from './permissions';
export { hasPermission } from './permissions';
export type { Permission } from './permissions';
import { AppError } from './errors';
import { cookies } from 'next/headers';

export interface BusinessContext {
  userId: string;
  userEmail: string;
  supabaseUserId: string;
  businessId: string;
  role: Role;
  membershipStatus: string;
}

/**
 * Synchronizes an authenticated Supabase user with the local Prisma User record.
 * 1. Checks by supabaseUserId.
 * 2. If not found, safely checks by email and links the real supabaseUserId.
 * 3. If neither exists, creates a new local Prisma User.
 * 4. Ensures allowed development/demo accounts receive active demo business memberships.
 */
export async function syncPrismaUser(supabaseUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
}): Promise<User> {
  const email = supabaseUser.email;
  if (!email) {
    throw new AppError('Unauthorized: Supabase user has no email', 'UNAUTHORIZED');
  }

  // 1. Check by real Supabase UUID
  let user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  // 2. If not found by Supabase UUID, lookup by email to link existing local records
  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // 3. Update existing user's supabaseUserId to match the real Supabase UUID
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseUserId: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || user.name,
        },
      });
      console.log(`[Auth Sync] Linked existing Prisma User ID: ${user.id} to Supabase User ID: ${supabaseUser.id}`);
    }
  }

  // 4. If user still does not exist, create new Prisma User
  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseUserId: supabaseUser.id,
        email,
        name: supabaseUser.user_metadata?.name || null,
      },
    });
    console.log(`[Auth Sync] Created new Prisma User ID: ${user.id} for Supabase User ID: ${supabaseUser.id}`);
  }

  // 5. If this is a demo account, ensure active membership in demo business
  if (user.email === 'admin@apexglobal.demo' || user.email === 'staff@apexglobal.demo') {
    const demoBiz = await prisma.business.findUnique({ where: { id: 'biz-apex-demo' } });
    if (demoBiz) {
      await prisma.businessMember.upsert({
        where: {
          businessId_userId: {
            businessId: demoBiz.id,
            userId: user.id,
          },
        },
        update: {
          status: 'ACTIVE',
        },
        create: {
          businessId: demoBiz.id,
          userId: user.id,
          role: user.email === 'admin@apexglobal.demo' ? 'OWNER' : 'STAFF',
          status: 'ACTIVE',
        },
      });
    }
  }

  return user;
}

/**
 * Gets authenticated Supabase user and resolves the local User record.
 * Throws UNAUTHORIZED AppError if not authenticated.
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    throw new AppError('Unauthorized: No active session', 'UNAUTHORIZED');
  }

  return await syncPrismaUser(supabaseUser);
}

/**
 * Resolves the business context for a requested business or active cookie selection.
 * If no businessId is requested, checks 'current_business_id' cookie, then defaults to first active membership.
 * Strictly verifies that the authenticated user has an ACTIVE membership in the target business.
 */
export async function requireBusinessContext(requestedBusinessId?: string): Promise<BusinessContext> {
  const user = await requireAuth();
  let targetBusinessId = requestedBusinessId;

  if (!targetBusinessId) {
    try {
      const cookieStore = await cookies();
      const cookieBusinessId = cookieStore.get('current_business_id')?.value;
      if (cookieBusinessId) {
        const cookieMember = await prisma.businessMember.findUnique({
          where: {
            businessId_userId: {
              businessId: cookieBusinessId,
              userId: user.id,
            },
          },
        });
        if (cookieMember && cookieMember.status === 'ACTIVE') {
          targetBusinessId = cookieBusinessId;
        }
      }
    } catch {
      // Cookies might not be readable in all execution contexts
    }
  }

  if (!targetBusinessId) {
    const defaultMembership = await prisma.businessMember.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultMembership) {
      console.warn(`[Auth Warning] No active business membership found for Prisma User: ${user.id} (${user.email}) | Supabase ID: ${user.supabaseUserId}`);
      throw new AppError('No business context: User has no active business membership', 'NOT_FOUND');
    }
    targetBusinessId = defaultMembership.businessId;
  }

  const member = await prisma.businessMember.findUnique({
    where: {
      businessId_userId: {
        businessId: targetBusinessId,
        userId: user.id,
      },
    },
  });

  if (!member || member.status !== 'ACTIVE') {
    console.warn(`[Auth Warning] User ${user.id} (${user.email}) is not an active member of requested business: ${targetBusinessId}`);
    throw new AppError('Forbidden: User is not an active member of this business', 'FORBIDDEN');
  }

  console.log(`[Auth] Supabase User ID: ${user.supabaseUserId} | Prisma User ID: ${user.id} | Selected Business ID: ${member.businessId} | Role: ${member.role}`);

  return {
    userId: user.id,
    userEmail: user.email,
    supabaseUserId: user.supabaseUserId,
    businessId: member.businessId,
    role: member.role,
    membershipStatus: member.status,
  };
}

/**
 * Ensures the authenticated user has an active membership in the business.
 */
export async function requireMembership(businessId: string): Promise<BusinessContext> {
  return await requireBusinessContext(businessId);
}

/**
 * Ensures the authenticated user has one of the required roles in the business context.
 */
export async function requireRole(requestedBusinessId: string | undefined, allowedRoles: Role[]): Promise<BusinessContext> {
  const context = await requireBusinessContext(requestedBusinessId);

  if (!allowedRoles.includes(context.role)) {
    throw new AppError(`Forbidden: Role '${context.role}' is not authorized for this action`, 'FORBIDDEN');
  }

  return context;
}

/**
 * Ensures the authenticated user has the required permission for the business context.
 */
export async function requirePermission(requestedBusinessId: string | undefined, permission: Permission): Promise<BusinessContext> {
  const context = await requireBusinessContext(requestedBusinessId);

  if (!hasPermission(context.role, permission)) {
    throw new AppError(`Forbidden: Insufficient permissions (${permission})`, 'FORBIDDEN');
  }

  return context;
}

/**
 * Fetches all businesses where the authenticated user is an active member.
 */
export async function getUserBusinesses() {
  const user = await requireAuth();

  const memberships = await prisma.businessMember.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
    include: { business: true },
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((m) => ({
    businessId: m.business.id,
    name: m.business.name,
    role: m.role,
    baseCurrency: m.business.baseCurrency,
    city: m.business.city,
    country: m.business.country,
  }));
}
