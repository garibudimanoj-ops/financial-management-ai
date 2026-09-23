import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white">404</h1>

        <h2 className="text-xl font-semibold text-slate-300">
          Page Not Found
        </h2>

        <p className="text-sm text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex items-center justify-center pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white transition-all"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
