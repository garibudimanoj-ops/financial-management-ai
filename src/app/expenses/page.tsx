import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializeExpense } from '@/lib/serialize';
import Link from 'next/link';
import { DollarSign, Package, ArrowLeft, Plus } from 'lucide-react';

export default async function ExpensesPage() {
  const context = await requireBusinessContext();
  const canCreate = hasPermission(context.role, 'EXPENSE_CREATE');
  const canView = hasPermission(context.role, 'EXPENSES_VIEW');

  const expenses = await prisma.expense.findMany({
    where: { businessId: context.businessId },
    include: {
      account: true,
      category: true,
      supplier: true,
    },
    orderBy: { expenseDate: 'desc' },
    take: 100,
  });

  const currency = (await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  }))?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: string | number | { toString(): string } | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const total = expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
  const paidCount = expenses.filter(e => e.paymentStatus === 'PAID').length;
  const pendingCount = expenses.filter(e => e.paymentStatus !== 'PAID').length;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Expenses
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Record operating expenses and track GST Input Tax Credit
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {canCreate && (
          <Link
            href="/expenses/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            New Expense
          </Link>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Expenses</span>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">{fmt(total)}</p>
          <span className="text-[11px] text-gray-500 block">Total operating expenses</span>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Paid</span>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">{fmt(expenses.filter(e => e.paymentStatus === 'PAID').reduce((s, e) => s + Number(e.totalAmount), 0))}</p>
          <span className="text-[11px] text-gray-500 block">Expenses paid</span>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Pending</span>
          <p className="text-3xl font-extrabold text-amber-400 font-mono">{fmt(expenses.filter(e => e.paymentStatus !== 'PAID').reduce((s, e) => s + Number(e.totalAmount), 0))}</p>
          <span className="text-[11px] text-gray-500 block">Expenses pending payment</span>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Expense Categories</span>
          <p className="text-3xl font-extrabold text-white font-mono">{expenses.length}</p>
          <span className="text-[11px] text-gray-500 block">Total expense entries</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payee / Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Account</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto text-gray-500 mb-2 opacity-50" />
                    <p className="font-medium text-gray-300">No expenses recorded yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Get started by adding your first expense voucher
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-white/[0.03] transition-colors text-gray-300">
                    <td className="py-3 px-4 text-xs font-mono whitespace-nowrap">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {expense.payeeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {expense.category?.name || 'Uncategorized'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {fmt(expense.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {expense.account?.code || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        expense.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {expense.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-white ${expense.paymentMethod === 'CASH' ? 'text-emerald-300' : expense.paymentMethod === 'CARD' ? 'text-indigo-300' : 'text-emerald-300'}`}>
                        {expense.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/expenses/${expense.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all inline-flex items-center"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
