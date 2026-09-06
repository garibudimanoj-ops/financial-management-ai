import { requireBusinessContext } from '@/lib/auth';
import { getTrialBalance } from '@/services/accounting/reportService';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

export default async function TrialBalancePage() {
  const context = await requireBusinessContext();
  const [report, business] = await Promise.all([
    getTrialBalance(context.businessId),
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true, name: true },
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';

  const fmt = (val: string | number) => {
    const num = Number(val);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const diff = Math.abs(Number(report.totalDebits) - Number(report.totalCredits));

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-extrabold text-white">Trial Balance</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Double-Entry General Ledger Balances for {business?.name} (Generated {new Date(report.generatedAt).toLocaleDateString()})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </Link>
        </div>
      </div>

      {/* Balance Verification Banner */}
      <div className={`p-4 rounded-xl flex items-center justify-between border ${
        report.isBalanced
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          : 'bg-red-950/40 border-red-500/30 text-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {report.isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {report.isBalanced ? 'Trial Balance is Fully Reconciled' : 'Trial Balance Out of Balance'}
            </h3>
            <p className="text-xs opacity-80">
              Total Debits ({currency} {fmt(report.totalDebits)}) = Total Credits ({currency} {fmt(report.totalCredits)})
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-full">
          Net Diff: {currency} {fmt(diff)}
        </span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 border-b border-white/10 uppercase text-xs">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Account Code</th>
                <th className="py-3.5 px-4 font-semibold">Account Name</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold text-right">Debit ({currency})</th>
                <th className="py-3.5 px-4 font-semibold text-right">Credit ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono text-indigo-300 font-medium">{item.accountCode}</td>
                  <td className="py-3 px-4 font-medium text-white">{item.accountName}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">
                      {item.accountType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-200">
                    {Number(item.netDebit) > 0 ? fmt(item.netDebit) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-200">
                    {Number(item.netCredit) > 0 ? fmt(item.netCredit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-white/10 font-bold border-t-2 border-white/20 text-white">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-right uppercase tracking-wide">
                  Grand Totals
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-400">
                  {fmt(report.totalDebits)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-400">
                  {fmt(report.totalCredits)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
