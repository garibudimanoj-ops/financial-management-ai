import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function AuditLogsPage() {
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'AUDIT_READ');

  const logs = await prisma.auditLog.findMany({
    where: { businessId: context.businessId },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Audit Logs</h1>
          <p className="text-gray-400 text-sm mt-1">Audit log records for compliance and tracking</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-all text-white font-medium"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="glass-card p-6 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 font-semibold">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 text-gray-300 hover:bg-white/5 transition-all">
                  <td className="py-3 px-4 text-xs font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-indigo-400">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {log.user?.email || 'System'}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono">
                    {log.ipAddress || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-xs max-w-xs truncate font-mono">
                    {log.details ? JSON.stringify(log.details) : '{}'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
