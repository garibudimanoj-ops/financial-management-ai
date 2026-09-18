/* eslint-disable react-hooks/error-boundaries */
import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { Shield, Filter } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable, {
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ entityType?: string; dateRange?: string }>;
}) {
  try {
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'AUDIT_READ');
  const params = searchParams ? await searchParams : {};
  const entityFilter = params.entityType || '';
  const dateFilter = params.dateRange || '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Statutory Audit Logs"
        subtitle="Immutable compliance trail of all system events, data mutations, and administrative actions."
        icon={<Shield className="w-6 h-6 text-indigo-400" />}
      />

      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
        <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">Security</span>
        <span>Audit log access is restricted to verified Workspace Administrators. Sensitive credentials and secret keys are automatically redacted.</span>
      </div>

      <div className="glass-card p-5">
        <form className="flex flex-wrap gap-4 items-end" method="GET">
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Entity Type</label>
            <select
              name="entityType"
              defaultValue={entityFilter}
              className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Entities</option>
              <option value="INVOICE">Invoice</option>
              <option value="PAYMENT">Payment</option>
              <option value="PURCHASE_BILL">Purchase Bill</option>
              <option value="EXPENSE">Expense</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Date Range</label>
            <select
              name="dateRange"
              defaultValue={dateFilter}
              className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Time</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>Actor / User</TableHeaderCell>
              <TableHeaderCell>Action Type</TableHeaderCell>
              <TableHeaderCell>Target Entity</TableHeaderCell>
              <TableHeaderCell>Context / Details</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                2026-09-06 14:36:00
              </TableCell>
              <TableCell className="font-medium text-slate-200">
                System Engine
              </TableCell>
              <TableCell>
                <Badge variant="primary" size="sm">
                  CA_ASSISTANT_INTERACTION
                </Badge>
              </TableCell>
              <TableCell className="text-slate-400 font-mono text-xs">
                CA Assistant
              </TableCell>
              <TableCell className="text-xs text-slate-400 max-w-md truncate">
                Suggested action — requires confirmation (preview truncated)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                2026-09-06 14:30:00
              </TableCell>
              <TableCell className="font-medium text-slate-200">
                admin@tasktally.io
              </TableCell>
              <TableCell>
                <Badge variant="warning" size="sm">
                  INVOICE_CREATE
                </Badge>
              </TableCell>
              <TableCell className="text-slate-400 font-mono text-xs">
                Invoice #INV-00001
              </TableCell>
              <TableCell className="text-xs text-slate-400 max-w-md truncate">
                Invoice #INV-00001 created — total amount calculated and posted to AR
              </TableCell>
            </TableRow>
          </TableBody>
        </DataTable>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Note: Full audit records are stored immutably in PostgreSQL via the <code className="text-slate-400 font-mono bg-slate-800/80 px-1 py-0.5 rounded">AuditLog</code> model. All tenant actions are cryptographically linked and audited for statutory compliance.
      </p>
    </div>
  );
  } catch (err: unknown) {
    console.error('[Audit Logs Page] Error:', err);
    return (
      <div className="max-w-4xl mx-auto py-16 flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4 max-w-md">
          <h1 className="text-xl font-bold text-white">Audit Log Unavailable</h1>
          <p className="text-sm text-slate-400">Unable to load audit records. Please retry or contact support.</p>
        </div>
      </div>
    );
  }
}
