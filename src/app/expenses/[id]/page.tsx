import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canEdit = hasPermission(context.role, 'EXPENSE_UPDATE');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      account: true,
      category: true,
      supplier: true,
    },
  });

  if (!expense || expense.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: string | number | { toString(): string } | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const getStatusBadge = () => {
    if (expense.paymentStatus === 'PAID') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">
              Expense #{expense.expenseNumber}
            </h1>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge()}`}>
              {expense.paymentStatus}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            Payee: {expense.payeeName} • {new Date(expense.expenseDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/expenses"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Expenses
          </Link>
        </div>
      </div>

      {/* Expense Details Card */}
      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payee & Category</h3>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-white">{expense.payeeName}</p>
              {expense.category?.name && <p className="text-gray-300">Category: {expense.category.name}</p>}
              {expense.supplier?.name && <p className="text-gray-300">Supplier: {expense.supplier.name}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Financial Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400">Amount</span>
                <p className="text-3xl font-bold text-emerald-400 font-mono">{fmt(expense.totalAmount)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Tax Rate</span>
                <p className="text-3xl font-bold text-amber-400 font-mono">{Number(expense.taxRate)}%</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Tax Amount</span>
                <p className="text-3xl font-bold text-amber-400 font-mono">{fmt(expense.taxAmount)}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment & Account</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400">Account</span>
                <p className="text-gray-300">{expense.account?.code || '—'} - {expense.account?.name || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Payment Method</span>
                <p className="text-gray-300">{expense.paymentMethod}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Payment Status</span>
                <p className={`font-medium ${expense.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {expense.paymentStatus}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Line & References */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Expense Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-gray-400">Expense Number</span>
              <p className="font-mono font-bold text-white">{expense.expenseNumber}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Expense Date</span>
              <p className="font-mono font-bold text-white">{new Date(expense.expenseDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Recorded</span>
              <p className="font-mono font-bold text-white">{new Date(expense.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">References & Notes</h4>
            <div className="grid grid-cols-2 gap-4">
              {expense.reference && (
                <div>
                  <span className="text-xs text-gray-400">Reference</span>
                  <p className="font-mono font-bold text-white">{expense.reference}</p>
                </div>
              )}
              {expense.receiptUrl && (
                <div>
                  <span className="text-xs text-gray-400">Receipt URL</span>
                  <p className="font-mono text-blue-400 underline font-small">
                    {expense.receiptUrl}
                  </p>
                </div>
              )}
              {expense.notes && (
                <div>
                  <span className="text-xs text-gray-400">Notes</span>
                  <p className="text-sm text-gray-300 line-clamp-3">{expense.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
