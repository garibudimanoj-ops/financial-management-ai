import { requireBusinessContext } from '@/lib/auth';
import { getProfitAndLoss } from '@/services/accounting/reportService';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default async function ProfitLossPage() {
  const context = await requireBusinessContext();
  const [report, business] = await Promise.all([
    getProfitAndLoss(context.businessId),
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

  const isProfitable = report.isProfitable;
  const startDateStr = report.startDate ? new Date(report.startDate).toLocaleDateString() : 'Beginning of FY';
  const endDateStr = report.endDate ? new Date(report.endDate).toLocaleDateString() : 'Current Date';

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-extrabold text-white">Profit & Loss Statement</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Financial Performance for {business?.name} ({startDateStr} — {endDateStr})
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 space-y-1 border border-emerald-500/20">
          <span className="text-xs text-gray-400 font-medium">Total Operating Revenue</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">
            {currency} {fmt(report.revenue.totalRevenue)}
          </p>
        </div>

        <div className="glass-card p-5 space-y-1 border border-amber-500/20">
          <span className="text-xs text-gray-400 font-medium">Total Operating Expenses</span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">
            {currency} {fmt(report.expenses.totalExpenses)}
          </p>
        </div>

        <div className={`glass-card p-5 space-y-1 border ${
          isProfitable ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-red-500/40 bg-red-950/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Net Profit / (Loss)</span>
            {isProfitable ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
          </div>
          <p className={`text-2xl font-extrabold font-mono ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
            {currency} {fmt(report.netProfitOrLoss)}
          </p>
        </div>
      </div>

      {/* Income Section */}
      <div className="glass-card overflow-hidden">
        <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-base text-white">1. Operating & Non-Operating Revenues</h2>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {currency} {fmt(report.revenue.totalRevenue)}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {report.revenue.items.length > 0 ? (
              report.revenue.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-xs text-indigo-300 w-24">{item.accountCode}</td>
                  <td className="py-3 px-4 font-medium text-white">{item.accountName}</td>
                  <td className="py-3 px-6 text-right font-mono text-gray-200">
                    {currency} {fmt(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 px-6 text-center text-gray-500">
                  No revenue entries recorded for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Section */}
      <div className="glass-card overflow-hidden">
        <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-base text-white">2. Direct & Indirect Expenses</h2>
          <span className="font-mono text-sm font-bold text-amber-400">
            {currency} {fmt(report.expenses.totalExpenses)}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {report.expenses.items.length > 0 ? (
              report.expenses.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-mono text-xs text-indigo-300 w-24">{item.accountCode}</td>
                  <td className="py-3 px-4 font-medium text-white">{item.accountName}</td>
                  <td className="py-3 px-6 text-right font-mono text-gray-200">
                    {currency} {fmt(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 px-6 text-center text-gray-500">
                  No expense entries recorded for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
