'use client';

import { useState, useEffect, Suspense } from 'react';
import { updatePassword } from '@/actions/auth';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordContent() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<
    'checking' | 'valid' | 'missing' | 'expired'
  >('checking');

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const validateRecoverySession = async () => {
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (getUserError || !user) {
        setSessionStatus('expired');
        setError('Invalid or expired password reset link. Request a new link.');
      } else {
        setSessionStatus('valid');
        setError(null);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (!active) return;

      if (event === 'PASSWORD_RECOVERY') {
        await validateRecoverySession();
      }

      if (event === 'SIGNED_OUT') {
        setSessionStatus('missing');
        setError(
          'Password reset link is invalid or has expired. Request a new link.'
        );
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      if (session) {
        validateRecoverySession();
      } else {
        setSessionStatus('expired');
        setError('Invalid or expired password reset link. Request a new link.');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (sessionStatus !== 'valid' || loading) {
      setError('A valid recovery session is required to update your password.');
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    const result = await updatePassword({ password });

    if (!result.success) {
      setError(
        result.error || 'An unexpected error occurred. Please try again.'
      );
      setLoading(false);
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Update Password
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Enter your new account password
          </p>
        </div>

        <div className="mt-2 text-[11px] text-amber-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {sessionStatus === 'checking'
            ? 'Verifying recovery session...'
            : sessionStatus === 'valid'
              ? 'Recovery session verified'
              : 'Invalid or expired session'}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              New Password
            </label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || sessionStatus !== 'valid'}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 pt-2">
          Back to{' '}
          <Link
            href="/login"
            className="text-indigo-400 hover:underline font-semibold"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
