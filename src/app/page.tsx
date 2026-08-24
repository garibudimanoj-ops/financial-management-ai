import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-height-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex mb-12">
        <p className="flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-zinc-200/50 lg:p-4 lg:dark:bg-zinc-800/30">
          AI CA &nbsp;|&nbsp; Financial Operations SaaS
        </p>
      </div>

      <div className="glass-card p-12 max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI CA
        </h1>
        <p className="text-gray-300 text-lg">
          Secure, multi-tenant financial operations and compliance platform built for freelancers, shopkeepers, and small businesses.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-medium text-white hover:opacity-90 transition-all shadow-lg hover:shadow-indigo-500/20"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-transparent border border-white/20 rounded-lg font-medium text-white hover:bg-white/5 transition-all"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
