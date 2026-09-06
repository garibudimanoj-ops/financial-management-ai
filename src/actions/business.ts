'use server';

import { requireAuth, requirePermission, requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { initializeChartOfAccounts } from '@/services/accounting/accountService';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Role } from '@prisma/client';

const onboardingSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  accountType: z.string().min(1, 'Account type is required'),
  businessType: z.string().min(1, 'Business type is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  baseCurrency: z.string().min(1, 'Base currency is required'),
  fiscalYearStart: z.string().min(1, 'Fiscal year start is required'),
  taxRegistrationStatus: z.boolean(),
  taxId: z.string().optional().nullable(),
});

/**
 * Onboard a new business, creating the business and setting the user as OWNER.
 */
export async function onboardBusiness(formData: z.infer<typeof onboardingSchema>) {
  const user = await requireAuth();
  const parsed = onboardingSchema.parse(formData);

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: parsed.name,
        accountType: parsed.accountType,
        businessType: parsed.businessType,
        country: parsed.country,
        state: parsed.state,
        city: parsed.city,
        baseCurrency: parsed.baseCurrency,
        fiscalYearStart: parsed.fiscalYearStart,
        taxRegistrationStatus: parsed.taxRegistrationStatus,
        taxId: parsed.taxId || null,
      },
    });

    const member = await tx.businessMember.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    // Auto-provision standard Chart of Accounts for new business
    await initializeChartOfAccounts(business.id, tx, business.baseCurrency);

    return { business, member };
  });

  // Set the newly created business as active in cookie
  const cookieStore = await cookies();
  cookieStore.set('current_business_id', result.business.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  await logAuditEvent({
    action: 'BUSINESS_CREATE',
    businessId: result.business.id,
    userId: user.id,
    details: { businessName: result.business.name },
  });

  redirect('/dashboard');
}

/**
 * Switch active business for the authenticated user.
 */
export async function switchBusiness(businessId: string) {
  const user = await requireAuth();

  const membership = await prisma.businessMember.findUnique({
    where: {
      businessId_userId: {
        businessId,
        userId: user.id,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new AppError('Forbidden: You are not an active member of this business', 'FORBIDDEN');
  }

  const cookieStore = await cookies();
  cookieStore.set('current_business_id', businessId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  redirect('/dashboard');
}

const invitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'ADMIN', 'STAFF']),
});

/**
 * Send an invitation to join a business.
 */
export async function inviteMember(businessId: string, formData: z.infer<typeof invitationSchema>) {
  const context = await requirePermission(businessId, 'MEMBERS_MANAGE');
  const parsed = invitationSchema.parse(formData);

  // Staff and Admin cannot invite Owners
  if (context.role !== 'OWNER' && parsed.role === 'OWNER') {
    throw new AppError('Forbidden: Only an Owner can invite another Owner', 'FORBIDDEN');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.businessInvitation.upsert({
    where: {
      businessId_email: {
        businessId,
        email: parsed.email.toLowerCase(),
      },
    },
    update: {
      role: parsed.role,
      status: 'PENDING',
      invitedById: context.userId,
      expiresAt,
    },
    create: {
      businessId,
      email: parsed.email.toLowerCase(),
      role: parsed.role,
      invitedById: context.userId,
      expiresAt,
    },
  });

  await logAuditEvent({
    action: 'MEMBER_INVITE',
    businessId,
    userId: context.userId,
    details: { invitedEmail: parsed.email, role: parsed.role },
  });

  return invitation;
}

/**
 * Accept an invitation to join a business.
 */
export async function acceptInvitation(invitationId: string) {
  const user = await requireAuth();

  const invitation = await prisma.businessInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.status !== 'PENDING') {
    throw new AppError('Invitation not found or no longer pending', 'NOT_FOUND');
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.businessInvitation.update({
      where: { id: invitationId },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('Invitation has expired', 'VALIDATION_ERROR');
  }

  const member = await prisma.$transaction(async (tx) => {
    const memberRecord = await tx.businessMember.upsert({
      where: {
        businessId_userId: {
          businessId: invitation.businessId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
        status: 'ACTIVE',
      },
      create: {
        businessId: invitation.businessId,
        userId: user.id,
        role: invitation.role,
        status: 'ACTIVE',
      },
    });

    await tx.businessInvitation.update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED', invitedUserId: user.id },
    });

    return memberRecord;
  });

  const cookieStore = await cookies();
  cookieStore.set('current_business_id', invitation.businessId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  await logAuditEvent({
    action: 'MEMBER_JOIN',
    businessId: invitation.businessId,
    userId: user.id,
    details: { invitationId },
  });

  return member;
}

/**
 * Decline an invitation.
 */
export async function declineInvitation(invitationId: string) {
  const user = await requireAuth();

  const invitation = await prisma.businessInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.status !== 'PENDING') {
    throw new AppError('Invitation not found or no longer pending', 'NOT_FOUND');
  }

  await prisma.businessInvitation.update({
    where: { id: invitationId },
    data: { status: 'REJECTED' },
  });

  await logAuditEvent({
    action: 'MEMBER_INVITE_DECLINE',
    businessId: invitation.businessId,
    userId: user.id,
    details: { invitationId },
  });

  return { success: true };
}

/**
 * Remove or suspend a member from a business.
 */
export async function removeMember(businessId: string, targetMemberId: string) {
  const context = await requirePermission(businessId, 'MEMBERS_MANAGE');

  const targetMember = await prisma.businessMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember || targetMember.businessId !== businessId) {
    throw new AppError('Member not found in this business', 'NOT_FOUND');
  }

  // Prevent self-removal if sole owner
  if (targetMember.userId === context.userId && targetMember.role === 'OWNER') {
    const ownerCount = await prisma.businessMember.count({
      where: { businessId, role: 'OWNER', status: 'ACTIVE' },
    });
    if (ownerCount <= 1) {
      throw new AppError('Cannot remove the sole owner of a business', 'FORBIDDEN');
    }
  }

  // Admin cannot remove an Owner
  if (context.role === 'ADMIN' && targetMember.role === 'OWNER') {
    throw new AppError('Forbidden: Admins cannot remove an Owner', 'FORBIDDEN');
  }

  await prisma.businessMember.update({
    where: { id: targetMemberId },
    data: { status: 'REMOVED' },
  });

  await logAuditEvent({
    action: 'MEMBER_REMOVE',
    businessId,
    userId: context.userId,
    details: { removedUserId: targetMember.userId, role: targetMember.role },
  });

  return { success: true };
}

const updateSettingsSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  taxRegistrationStatus: z.boolean(),
  taxId: z.string().optional().nullable(),
});

/**
 * Update business settings (requires BUSINESS_UPDATE permission).
 */
export async function updateBusinessSettings(businessId: string, formData: z.infer<typeof updateSettingsSchema>) {
  const context = await requirePermission(businessId, 'BUSINESS_UPDATE');
  const parsed = updateSettingsSchema.parse(formData);

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: parsed.name,
      country: parsed.country,
      state: parsed.state,
      city: parsed.city,
      taxRegistrationStatus: parsed.taxRegistrationStatus,
      taxId: parsed.taxRegistrationStatus ? parsed.taxId || null : null,
    },
  });

  await logAuditEvent({
    action: 'BUSINESS_UPDATE',
    businessId,
    userId: context.userId,
    details: { updatedFields: parsed },
  });

  return updated;
}
