export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-6 w-24 bg-white/5 rounded-full animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 md:col-span-2 space-y-6">
          <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-7 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="h-5 w-32 bg-white/5 rounded animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
