import { requireBusinessContext } from '@/lib/auth';
import { getBalanceSheet } from '@/services/accounting/reportService';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, PieChart, CheckCircle2, AlertTriangle } from 'lucide-react';

export default async function BalanceSheetPage() {
  const context = await requireBusinessContext();
  const [report, business] = await Promise.all([
    getBalanceSheet(context.businessId),
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

  const diff = Math.abs(Number(report.totalAssets) - Number(report.totalLiabilitiesAndEquity));

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-extrabold text-white">Balance Sheet</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Statement of Financial Position for {business?.name} as of {new Date(report.asOfDate).toLocaleDateString()}
          </p>
        </div>

        <Link
          href="/reports"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>
      </div>

      {/* Equation Verification Banner */}
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
              {report.isBalanced ? 'Fundamental Accounting Equation Satisfied' : 'Accounting Equation Imbalance'}
            </h3>
            <p className="text-xs opacity-80">
              Total Assets ({currency} {fmt(report.totalAssets)}) = Total Liabilities & Equity ({currency} {fmt(report.totalLiabilitiesAndEquity)})
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-full">
          Diff: {currency} {fmt(diff)}
        </span>
      </div>

      {/* Assets Section */}
      <div className="glass-card overflow-hidden">
        <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-base text-white">1. Assets (Current & Fixed)</h2>
          <span className="font-mono text-sm font-bold text-indigo-400">
            {currency} {fmt(report.assets.total)}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {report.assets.items.length > 0 ? (
              report.assets.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-xs text-indigo-300 w-24">{item.accountCode}</td>
                  <td className="py-3 px-4 font-medium text-white">{item.accountName}</td>
                  <td className="py-3 px-6 text-right font-mono text-gray-200">
                    {currency} {fmt(item.balance)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 px-6 text-center text-gray-500">
                  No asset accounts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Liabilities Section */}
      <div className="glass-card overflow-hidden">
        <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-base text-white">2. Liabilities (Current & Non-Current)</h2>
          <span className="font-mono text-sm font-bold text-amber-400">
            {currency} {fmt(report.liabilities.total)}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {report.liabilities.items.length > 0 ? (
              report.liabilities.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-xs text-indigo-300 w-24">{item.accountCode}</td>
                  <td className="py-3 px-4 font-medium text-white">{item.accountName}</td>
                  <td className="py-3 px-6 text-right font-mono text-gray-200">
                    {currency} {fmt(item.balance)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 px-6 text-center text-gray-500">
                  No liability accounts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Equity Section */}
      <div className="glass-card overflow-hidden">
        <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-base text-white">3. Owner&apos;s Equity & Retained Earnings</h2>
          <span className="font-mono text-sm font-bold text-purple-400">
            {currency} {fmt(report.equity.total)}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {report.equity.items.length > 0 ? (
              report.equity.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-xs text-indigo-300 w-24">{item.accountCode}</td>
                  <td className="py-3 px-4 font-medium text-white">{item.accountName}</td>
                  <td className="py-3 px-6 text-right font-mono text-gray-200">
                    {currency} {fmt(item.balance)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 px-6 text-center text-gray-500">
                  No equity accounts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
