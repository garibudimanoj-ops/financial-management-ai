export default function InventoryLoading() {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="h-8 w-72 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-80 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-2">
            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
            <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-2 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
