import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DollarSign, Plus, Receipt, CheckCircle2, Clock, Tags } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import DataTable, {
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/DataTable';

export default async function ExpensesPage() {
  const context = await requireBusinessContext();
  const canCreate = hasPermission(context.role, 'EXPENSE_CREATE');

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
  const paidAmount = expenses.filter(e => e.paymentStatus === 'PAID').reduce((s, e) => s + Number(e.totalAmount), 0);
  const pendingAmount = expenses.filter(e => e.paymentStatus !== 'PAID').reduce((s, e) => s + Number(e.totalAmount), 0);
  const paidCount = expenses.filter(e => e.paymentStatus === 'PAID').length;
  const pendingCount = expenses.filter(e => e.paymentStatus !== 'PAID').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Expenses & Operating Costs"
        subtitle="Track operating expenditure, categorize vouchers, and monitor GST Input Tax Credit."
        icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
        actions={
          canCreate ? (
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              <Plus className="w-4 h-4" />
              New Expense
            </Link>
          ) : undefined
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Expenses"
          value={fmt(total)}
          description={`${expenses.length} total entries recorded`}
          icon={<Receipt className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Settled Expenses"
          value={fmt(paidAmount)}
          description={`${paidCount} vouchers paid`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Pending Payment"
          value={fmt(pendingAmount)}
          description={`${pendingCount} awaiting settlement`}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Active Categories"
          value={new Set(expenses.map(e => e.categoryId).filter(Boolean)).size.toString()}
          description="Distinct expense categories"
          icon={<Tags className="w-5 h-5 text-indigo-400" />}
        />
      </div>

      {/* Expenses Table */}
      <div className="glass-card overflow-hidden">
        {expenses.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-10 h-10 text-slate-500" />}
            title="No expenses recorded yet"
            description="Get started by recording your first business expense voucher."
            action={
              canCreate ? (
                <Link
                  href="/expenses/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </Link>
              ) : undefined
            }
          />
        ) : (
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Payee / Vendor</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell align="right">Amount</TableHeaderCell>
                <TableHeaderCell>Account</TableHeaderCell>
                <TableHeaderCell>Payment Status</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell align="right">Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium text-slate-100">
                    {expense.payeeName || expense.supplier?.name || '—'}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {expense.category?.name || 'Uncategorized'}
                  </TableCell>
                  <TableCell align="right" className="font-mono font-bold text-slate-100">
                    {fmt(expense.totalAmount)}
                  </TableCell>
                  <TableCell className="text-slate-400 font-mono text-xs">
                    {expense.account?.code || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={expense.paymentStatus === 'PAID' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {expense.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                      {expense.paymentMethod || 'STANDARD'}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <Link
                      href={`/expenses/${expense.id}`}
                      className="px-2.5 py-1 rounded text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        )}
      </div>
    </div>
  );
}
