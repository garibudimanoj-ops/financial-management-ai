import { requireBusinessContext, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import Link from 'next/link';
import { DollarSign, ArrowLeft } from 'lucide-react';

export default async function NewExpensePage() {
  const context = await requireBusinessContext();
  await requirePermission(context.businessId, 'EXPENSE_CREATE');

  const [business, accounts, categories, suppliers] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.account.findMany({
      where: { businessId: context.businessId, type: 'EXPENSE', isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
    prisma.expenseCategory.findMany({
      where: { businessId: context.businessId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.findMany({
      where: { businessId: context.businessId, archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            New Expense Voucher
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Record an operating expense and post it to the double-entry General Ledger
          </p>
        </div>
        <Link
          href="/expenses"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all text-white font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Expenses
        </Link>
      </div>

      <div className="glass-card p-6 md:p-8">
        <ExpenseForm
          businessId={context.businessId}
          currency={currency}
          accounts={accounts}
          categories={categories}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}