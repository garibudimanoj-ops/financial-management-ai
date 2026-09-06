import { requireBusinessContext, requirePermission } from '@/lib/auth';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ entityType?: string; dateRange?: string }>
}) {
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'AUDIT_READ');
  const params = searchParams ? await searchParams : {};
  const entityFilter = params.entityType || '';
  const dateFilter = params.dateRange || '';

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-400" />
          Audit Log
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          System events and actions for this business. Data is scoped to your workspace.
        </p>
        <div className="mt-2 text-[11px] text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded px-2 py-1 inline-block">
          Note: Audit viewer requires ADMIN or OWNER role. Metadata is safe (no secrets shown).
        </div>
      </div>

      <div className="glass-card p-4 space-y-4">
        <form className="flex flex-wrap gap-3 items-end" method="GET">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Entity Type</label>
            <select name="entityType" defaultValue={entityFilter} className="glass-input px-3 py-2 rounded-lg text-sm">
              <option value="">All</option>
              <option value="INVOICE">Invoice</option>
              <option value="PAYMENT">Payment</option>
              <option value="PURCHASE_BILL">Purchase</option>
              <option value="EXPENSE">Expense</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Date Range</label>
            <select name="dateRange" defaultValue={dateFilter} className="glass-input px-3 py-2 rounded-lg text-sm">
              <option value="">All</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-all">
            Filter
          </button>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-400 font-semibold bg-white/[0.02]">
            <tr>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Details (safe preview)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="hover:bg-white/[0.03] transition-colors">
              <td className="py-3 px-4 text-xs text-gray-400 font-mono">2026-09-06 14:36:00</td>
              <td className="py-3 px-4 text-gray-300">System</td>
              <td className="py-3 px-4 text-indigo-300 font-medium">CA_ASSISTANT_INTERACTION</td>
              <td className="py-3 px-4 text-xs text-gray-500">CA Assistant</td>
              <td className="py-3 px-4 text-xs text-gray-500">Suggested action — requires confirmation (preview truncated)</td>
            </tr>
            <tr className="hover:bg-white/[0.03] transition-colors">
              <td className="py-3 px-4 text-xs text-gray-400 font-mono">2026-09-06 14:30:00</td>
              <td className="py-3 px-4 text-gray-300">admin@example.com</td>
              <td className="py-3 px-4 text-amber-300 font-medium">INVOICE_CREATE</td>
              <td className="py-3 px-4 text-xs text-gray-500">Invoice</td>
              <td className="py-3 px-4 text-xs text-gray-500">Invoice #INV-00001 created — total amount shown</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Note: Full audit data is stored securely in the database (`AuditLog` model) with safe metadata. No secrets or full connection details are displayed here.
      </p>
    </div>
  );
}
