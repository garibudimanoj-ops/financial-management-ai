'use client';

import { useState } from 'react';
import { z } from 'zod';
import { signup } from '@/actions/auth';
import Link from 'next/link';
import { ShieldCheck, UserPlus, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const signupSchema = z.object({
    email: z.string().email('Please enter a valid work email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your input and try again.');
      setLoading(false);
      return;
    }

    try {
      await signup({ email: parsed.data.email, password: parsed.data.password });
    } catch (err: unknown) {
      // Preserve Next.js redirect exceptions; don't swallow NEXT_REDIRECT
      if (
        err instanceof Error &&
        (err.message?.includes('NEXT_REDIRECT') ||
          (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : 'Account creation failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            right: '-10%',
            width: '55%',
            height: '55%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            left: '-5%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
            }}
          >
            <span className="text-white font-bold text-xl tracking-wider">TT</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Create your workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Start your AI-powered financial management journey
          </p>
        </div>

        {/* Sign Up Card */}
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{
            background: 'rgba(17, 24, 39, 0.90)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 8px 40px -4px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Error Alert */}
          {error && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
              }}
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                spellCheck={false}
                className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                placeholder="you@company.com"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="glass-input w-full px-4 py-3 pr-11 rounded-xl text-sm"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                At least 6 characters. Use a mix of letters, numbers &amp; symbols for stronger security.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              style={{
                background: loading
                  ? 'rgba(99,102,241,0.6)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px -2px rgba(99,102,241,0.4)',
              }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-xs text-slate-500 pt-2">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Sign in instead
            </Link>
          </p>
        </div>

        {/* Trust Footer */}
        <div className="mt-6 flex items-center justify-center gap-5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bank-grade security</span>
          </div>
          <div className="w-px h-3 bg-slate-700" aria-hidden="true" />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Data isolated per tenant</span>
          </div>
          <div className="w-px h-3 bg-slate-700" aria-hidden="true" />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>No credit card required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
