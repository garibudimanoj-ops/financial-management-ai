'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { syncPrismaUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Log in using email/password.
 */
export async function login(formData: z.infer<typeof authSchema>) {
  const supabase = await createClient();
  const parsed = authSchema.parse(formData);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    throw new Error(error.message);
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
  const supabase = await createClient();
  const parsed = authSchema.parse(formData);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: `${siteUrl}/login`,
    },
  });

  if (error) {
    throw new Error(error.message);
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
  redirect('/login');
}

const resetRequestSchema = z.object({
  email: z.string().email(),
});

/**
 * Request password reset email.
 */
export async function requestPasswordReset(formData: z.infer<typeof resetRequestSchema>) {
  const supabase = await createClient();
  const parsed = resetRequestSchema.parse(formData);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Temporary diagnostic logging for CI/debugging (no secrets logged)
  const redirectTarget = `${siteUrl}/reset-password`;
  console.log(`[Auth Reset Request] URL base: ${siteUrl}; redirect target: ${redirectTarget}`);

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    console.log(`[Auth Reset Request] Supabase error: ${error.message} (code: ${error.status || 'N/A'})`);
    throw new Error(error.message);
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
  const supabase = await createClient();
  const parsed = updatePasswordSchema.parse(formData);

  // Check recovery session status for diagnostics
  const { data: sessionData } = await supabase.auth.getSession();
  console.log(`[Auth Update Password] Session exists: ${!!sessionData?.session}; recovery context: ${sessionData?.session?.access_token ? 'present' : 'missing'}`);

  const { error } = await supabase.auth.updateUser({
    password: parsed.password,
  });

  if (error) {
    console.log(`[Auth Update Password] Supabase error: ${error.message}`);
    throw new Error(error.message);
  }

  console.log(`[Auth Update Password] Password updated successfully for user.`);

  redirect('/login');
}
