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

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
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
      details: { email: user.email },
    });
  }

  redirect('/onboarding');
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

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
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

  const { error } = await supabase.auth.updateUser({
    password: parsed.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect('/login');
}
