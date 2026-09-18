'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { syncPrismaUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';
import { AppError } from '@/lib/errors';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Log in using email/password.
 */
export async function login(formData: z.infer<typeof authSchema>) {
  const parsed = authSchema.parse(formData);

  const rateKey = `login:${parsed.email}`;
  const isAllowed = checkRateLimit(rateKey, 5, 15 * 60000); // 5 attempts per 15 minutes
  if (!isAllowed) {
    console.warn(`[Auth Login] Rate limited for: ${parsed.email}`);
    throw new AppError('Too many login attempts. Please try again later.', 'RATE_LIMITED');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    console.error('[Auth Login] Supabase error:', error.message);
    throw new AppError('Invalid email or password.', 'UNAUTHORIZED');
  }

  const user = await syncPrismaUser(data.user);

  console.log(`[Auth Login] Supabase User ID: ${data.user.id} | Prisma User ID: ${user.id} | Email: ${user.email}`);

  await logAuditEvent({
    action: 'USER_LOGIN',
    userId: user.id,
    details: { email: user.email },
  });

  const membership = await prisma.businessMember.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
  });

  if (membership) {
    redirect('/dashboard');
  } else {
    redirect('/onboarding');
  }
}

/**
 * Sign up using email/password.
 */
export async function signup(formData: z.infer<typeof authSchema>) {
  const parsed = authSchema.parse(formData);

  const rateKey = `signup:${parsed.email}`;
  const isAllowed = checkRateLimit(rateKey, 3, 60 * 60000); // 3 signups per hour
  if (!isAllowed) {
    console.warn(`[Auth Signup] Rate limited for: ${parsed.email}`);
    throw new AppError('Too many sign-up attempts. Please try again later.', 'RATE_LIMITED');
  }

  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/login`,
    },
  });

  if (error) {
    console.error('[Auth Signup] Supabase error:', error.message);
    throw new AppError('Unable to create account. Please try again later.', 'UNAUTHORIZED');
  }

  if (data.user) {
    const user = await syncPrismaUser(data.user);

    console.log(`[Auth Signup] Supabase User ID: ${data.user.id} | Prisma User ID: ${user.id} | Email: ${user.email}`);

    await logAuditEvent({
      action: 'USER_SIGNUP',
      userId: user.id,
      details: { email: user.email, requiresConfirmation: !data.session },
    });
  }

  if (data.session) {
    redirect('/onboarding');
  } else {
    redirect('/login?message=check-email');
  }
}

/**
 * Log out current session.
 */
export async function logout() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const localUser = await prisma.user.findUnique({
        where: { supabaseUserId: user.id },
      });
      if (localUser) {
        await logAuditEvent({
          action: 'USER_LOGOUT',
          userId: localUser.id,
        });
      }
    }

    await supabase.auth.signOut();
  } catch (err: unknown) {
    console.error('[Auth Logout] Unexpected error during logout:', err);
    // Preserve server-side logging; do not expose internal details to user
  }
  redirect('/login');
}

const resetRequestSchema = z.object({
  email: z.string().email(),
});

/**
 * Request password reset email.
 */
export async function requestPasswordReset(formData: z.infer<typeof resetRequestSchema>) {
  const parsed = resetRequestSchema.parse(formData);

  const rateKey = `password-reset:${parsed.email}`;
  const isAllowed = checkRateLimit(rateKey, 3, 60 * 60000); // 3 reset requests per hour
  if (!isAllowed) {
    console.warn(`[Auth Reset Request] Rate limited for: ${parsed.email}`);
    throw new AppError('Too many password reset requests. Please try again later.', 'RATE_LIMITED');
  }

  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Temporary diagnostic logging for CI/debugging (no secrets logged)
  const redirectTarget = `${siteUrl}/auth/callback?next=/reset-password`;
  console.log(`[Auth Reset Request] URL base: ${siteUrl}; redirect target: ${redirectTarget}`);

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error('[Auth Reset Request] Supabase error:', error.message);
    // Return generic message to avoid email enumeration
    throw new AppError('If the email exists, a reset link has been sent.', 'NOT_FOUND');
  }

  console.log(`[Auth Reset Request] Success for email: ${parsed.email}`);
}

const updatePasswordSchema = z.object({
  password: z.string().min(6),
});

/**
 * Update password (after reset).
 */
export async function updatePassword(formData: z.infer<typeof updatePasswordSchema>) {
  const parsed = updatePasswordSchema.parse(formData);

  const supabase = await createClient();

  // Check recovery session status for diagnostics
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user?.id) {
    console.warn('[Auth Update Password] Recovery session missing');
    throw new AppError('A valid recovery session is required to update your password.', 'UNAUTHORIZED');
  }

  const rateKey = `password-update:${sessionData.session.user.id}`;
  const isAllowed = checkRateLimit(rateKey, 10, 60 * 60000); // 10 attempts per hour
  if (!isAllowed) {
    console.warn(`[Auth Update Password] Rate limited for user: ${sessionData.session.user.id}`);
    throw new AppError('Too many password update attempts. Please try again later.', 'RATE_LIMITED');
  }

  console.log(`[Auth Update Password] Session exists: ${!!sessionData?.session}; recovery context: ${sessionData?.session?.access_token ? 'present' : 'missing'}`);

  const { error } = await supabase.auth.updateUser({
    password: parsed.password,
  });

  if (error) {
    console.error('[Auth Update Password] Supabase error:', error.message);
    throw new AppError('Unable to update password. Please try again.', 'UNAUTHORIZED');
  }

  console.log(`[Auth Update Password] Password updated successfully for user.`);

  redirect('/login');
}
