export default function InventoryLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="h-8 w-72 bg-slate-800/60 rounded animate-pulse" />
          <div className="h-4 w-80 bg-slate-800/40 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-2">
            <div className="h-3 w-24 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-8 w-32 bg-slate-800/40 rounded animate-pulse" />
            <div className="h-2 w-20 bg-slate-800/30 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        <div className="bg-white/5 px-6 py-3 border-b border-white/10">
          <div className="h-5 w-48 bg-slate-800/50 rounded animate-pulse" />
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/20">
            <tr>
              {[1, 2, 3, 4, 5].map((c) => (
                <th key={c} className="py-3 px-4">
                  <div className="h-3 w-24 bg-slate-800/40 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {[1, 2, 3, 4, 5].map((c) => (
                  <td key={c} className="py-3 px-4">
                    <div className="h-3 w-16 bg-slate-800/20 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
