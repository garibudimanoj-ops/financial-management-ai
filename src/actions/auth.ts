'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { syncPrismaUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { checkRateLimitShared } from '@/lib/rateLimit';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Log in using email/password.
 */
export async function login(formData: z.infer<typeof authSchema>) {
  try {
    const parsed = authSchema.parse(formData);

    const rateKey = `login:${parsed.email.trim().toLowerCase()}`;
    const isAllowed = await checkRateLimitShared(rateKey, 5, 15 * 60000);
    if (!isAllowed) {
      console.warn('[Auth Login] Rate limited');
      return { success: false, error: 'Too many login attempts. Please try again later.' };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      console.error('[Auth Login] Supabase error:', error.message);
      return { success: false, error: 'Invalid email or password.' };
    }

    const user = await syncPrismaUser(data.user);

    console.log(`[Auth Login] Supabase User ID: ${data.user.id} | Prisma User ID: ${user.id}`);

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
  } catch (err: unknown) {
    if (err instanceof Error && (err.message?.includes('NEXT_REDIRECT') || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))) {
      throw err;
    }
    console.error('[Auth Login] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Sign up using email/password.
 */
export async function signup(formData: z.infer<typeof authSchema>) {
  try {
    const parsed = authSchema.parse(formData);

    const rateKey = `signup:${parsed.email.trim().toLowerCase()}`;
    const isAllowed = await checkRateLimitShared(rateKey, 3, 60 * 60000);
    if (!isAllowed) {
      console.warn('[Auth Signup] Rate limited');
      return { success: false, error: 'Too many sign-up attempts. Please try again later.' };
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
      return { success: false, error: 'Unable to create account. Please try again later.' };
    }

    if (data.user && data.session) {
      const user = await syncPrismaUser(data.user);

      console.log(`[Auth Signup] Supabase User ID: ${data.user.id} | Prisma User ID: ${user.id}`);

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
  } catch (err: unknown) {
    if (err instanceof Error && (err.message?.includes('NEXT_REDIRECT') || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))) {
      throw err;
    }
    console.error('[Auth Signup] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
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
  try {
    const parsed = resetRequestSchema.parse(formData);

    const rateKey = `password-reset:${parsed.email.trim().toLowerCase()}`;
    const isAllowed = await checkRateLimitShared(rateKey, 3, 60 * 60000); // 3 reset requests per hour
    if (!isAllowed) {
      console.warn('[Auth Reset Request] Rate limited');
      return { success: false, error: 'Too many password reset requests. Please try again later.' };
    }

    const supabase = await createClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error('[Auth Reset Request] Supabase error:', error.message);
      // Return generic message to avoid email enumeration
      return { success: false, error: 'If the email exists, a reset link has been sent.' };
    }

    console.log('[Auth Reset Request] Reset email sent');

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error && (err.message?.includes('NEXT_REDIRECT') || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))) {
      throw err;
    }
    console.error('[Auth Reset Request] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
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

  const { error } = await supabase.auth.updateUser({
    password: parsed.password,
  });

  if (error) {
    console.error('[Auth Update Password] Supabase error:', error.message);
    return { success: false, error: 'Unable to update password. Please try again.' };
  }

  console.log('[Auth Update Password] Password updated successfully.');

  redirect('/login');
}
