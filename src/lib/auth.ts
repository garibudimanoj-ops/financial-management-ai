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
 * Gets authenticated Supabase user and resolves the local User record.
 * Throws UNAUTHORIZED AppError if not authenticated.
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    throw new AppError('Unauthorized: No active session', 'UNAUTHORIZED');
  }

  let user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  // If user is authenticated in Supabase but doesn't exist in Prisma DB yet, auto-create
  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || null,
      },
    });
  }

  return user;
}

/**
 * Resolves the business context for a requested business or active cookie selection.
 * If no businessId is requested, checks 'current_business_id' cookie, then defaults to first active membership.
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
    throw new AppError('Forbidden: User is not an active member of this business', 'FORBIDDEN');
  }

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
export async function requireRole(requestedBusinessId: string, allowedRoles: Role[]): Promise<BusinessContext> {
  const context = await requireBusinessContext(requestedBusinessId);

  if (!allowedRoles.includes(context.role)) {
    throw new AppError(`Forbidden: Role '${context.role}' is not authorized for this action`, 'FORBIDDEN');
  }

  return context;
}

/**
 * Ensures the authenticated user has the required permission for the business context.
 */
export async function requirePermission(requestedBusinessId: string, permission: Permission): Promise<BusinessContext> {
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
