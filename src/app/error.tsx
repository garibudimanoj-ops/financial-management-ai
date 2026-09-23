'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="text-sm text-slate-400">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-500 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
