'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto flex items-center justify-center">
      <div className="glass-card p-8 max-w-md text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-sm text-gray-400">
          Failed to load dashboard data. This may be a temporary issue.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-500 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
          >
            Reload
          </Link>
        </div>
      </div>
    </div>
  );
}
