export default function CustomersLoading() {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="glass-card p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-white/5 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
