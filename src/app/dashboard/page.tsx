import { requireBusinessContext } from '@/lib/auth';
import { getInventorySummary } from '@/lib/inventory/service';
import { prisma } from '@/lib/prisma';
import BusinessSwitcher from '@/components/BusinessSwitcher';
import Link from 'next/link';
import {
  Users,
  Settings as SettingsIcon,
  FileText,
  Boxes,
  Receipt,
  LogOut,
  TrendingUp,
  ShieldCheck,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Plus,
  Calendar,
} from 'lucide-react';

type DateRange = 'today' | 'this-week' | 'this-month' | 'this-year' | 'all-time';

function getDateRangeBounds(range: DateRange): { start: Date | null; label: string; subLabel: string } {
  const now = new Date();
  switch (range) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, label: "Today's Sales", subLabel: 'Since midnight' };
    }
    case 'this-week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      return { start, label: "This Week's Sales", subLabel: 'From start of week' };
    }
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, label: "This Month's Sales", subLabel: 'Current billing cycle' };
    }
    case 'this-year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, label: "This Year's Sales", subLabel: 'Year-to-date revenue' };
    }
    case 'all-time':
    default:
      return { start: null, label: 'Total Sales', subLabel: 'All recorded revenue' };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (params.range as DateRange) || 'all-time';
  const rangeBounds = getDateRangeBounds(range);

  const context = await requireBusinessContext();
  const businesses = await (await import('@/lib/auth')).getUserBusinesses();
  const isOwner = context.role === 'OWNER' || context.role === 'ADMIN';

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
  });

  const dateFilter = rangeBounds.start ? { gte: rangeBounds.start } : undefined;

  const [
    totalProducts,
    totalCustomers,
    lowStockCount,
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    partialInvoices,
    totalSales,
    filteredSales,
    totalPayments,
    filteredPayments,
    outstandingReceivables,
    inventoryValuation,
  ] = await Promise.all([
    prisma.product.count({ where: { businessId: context.businessId, archived: false } }),
    prisma.customer.count({ where: { businessId: context.businessId, archived: false } }),
    prisma.product.count({
      where: {
        businessId: context.businessId,
        archived: false,
        stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
      },
    }),
    prisma.invoice.count({ where: { businessId: context.businessId } }),
    prisma.invoice.count({ where: { businessId: context.businessId, status: 'PAID' } }),
    prisma.invoice.count({ where: { businessId: context.businessId, status: 'ISSUED' } }),
    prisma.invoice.count({ where: { businessId: context.businessId, status: 'PARTIALLY_PAID' } }),
    prisma.invoice.aggregate({ where: { businessId: context.businessId }, _sum: { totalAmount: true } }),
    prisma.invoice.aggregate({
      where: {
        businessId: context.businessId,
        ...(dateFilter ? { issueDate: dateFilter } : {}),
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({ where: { businessId: context.businessId }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: {
        businessId: context.businessId,
        ...(dateFilter ? { receivedAt: dateFilter } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.customer.aggregate({ where: { businessId: context.businessId }, _sum: { currentBalance: true } }),
    // Monetary inventory valuation (weighted-average cost), not a raw unit count.
    getInventorySummary(context.businessId),
  ]);

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: number | string | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header / Navigation Bar */}
      <div className="flex flex-col md:flex-row items-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <BusinessSwitcher
            currentBusinessId={context.businessId}
            businesses={businesses}
          />
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              {context.role} Access
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && (
            <Link
              href="/employees"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-200"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              Team
            </Link>
          )}

          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-200"
          >
            <SettingsIcon className="w-4 h-4 text-gray-400" />
            Settings
          </Link>

          <form action={await (await import('@/actions/auth')).logout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-500/30 text-red-300 rounded-xl text-sm font-medium hover:bg-red-900/40 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </form>
        </div>
      </div>

      {/* Date Range Filter & Quick Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Range</span>
          </div>
          {([
            { value: 'today', label: 'Today' },
            { value: 'this-week', label: 'This Week' },
            { value: 'this-month', label: 'This Month' },
            { value: 'this-year', label: 'This Year' },
            { value: 'all-time', label: 'All Time' },
          ] as const).map((opt) => (
            <Link
              key={opt.value}
              href={opt.value === 'all-time' ? '/dashboard' : `/dashboard?range=${opt.value}`}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                range === opt.value
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Quick Actions</span>
            <Link
              href="/products/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </Link>
            <Link
              href="/pos"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            >
              <Receipt className="w-3.5 h-3.5" />
              Issue Invoice
            </Link>
            <Link
              href="/customers/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Customer
            </Link>
            <Link
              href="/inventory"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
            >
              <Boxes className="w-3.5 h-3.5" />
              Stock In
            </Link>
            <Link
              href="/payments"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </Link>
          </div>
        )}
      </div>

      {/* Financial Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Financial Snapshot
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Real database aggregations for {business?.name} ({business?.baseCurrency})
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              LIVE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/invoices"
              className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all block group"
            >
              <span className="text-xs text-gray-400 group-hover:text-indigo-300 transition-colors">Total Sales</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {fmt(totalSales._sum.totalAmount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-600">All recorded revenue</span>
            </Link>

            <Link
              href="/customers"
              className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all block group"
            >
              <span className="text-xs text-gray-400 group-hover:text-indigo-300 transition-colors">Customer Receivables</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
                {fmt(outstandingReceivables._sum.currentBalance?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-600">Unsettled credit sales</span>
            </Link>

            <Link
              href="/payments"
              className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all block group"
            >
              <span className="text-xs text-gray-400 group-hover:text-indigo-300 transition-colors">Payments Received</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {fmt(totalPayments._sum.amount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-600">Total collections</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">{rangeBounds.label}</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
                {fmt(filteredSales._sum.totalAmount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-600">{rangeBounds.subLabel}</span>
            </div>

            <Link
              href="/payments"
              className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all block group"
            >
              <span className="text-xs text-gray-400 group-hover:text-indigo-300 transition-colors">Payments ({range === 'all-time' ? 'All Time' : rangeBounds.label})</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">
                {fmt(filteredPayments._sum.amount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-600">Collections in period</span>
            </Link>

            <Link
              href="/inventory"
              className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all block group"
            >
              <span className="text-xs text-gray-400 group-hover:text-indigo-300 transition-colors">Inventory Value</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {fmt(inventoryValuation.totalValuation.toNumber())}
              </p>
              <span className="text-[10px] text-gray-600">At weighted-average cost</span>
            </Link>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Compliance & Workspace</h2>
            <div className="space-y-2 mt-4 text-sm text-gray-300">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400 text-xs">Entity Type</span>
                <span className="font-medium text-xs text-white">{business?.accountType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400 text-xs">Base Currency</span>
                <span className="font-medium text-xs text-white">{business?.baseCurrency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400 text-xs">Fiscal Year Start</span>
                <span className="font-medium text-xs text-white">{business?.fiscalYearStart}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400 text-xs">Tax Registered</span>
                <span className="font-medium text-xs text-white">{business?.taxRegistrationStatus ? 'Yes' : 'No'}</span>
              </div>
              {business?.taxId && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400 text-xs">GSTIN / Tax ID</span>
                  <span className="font-mono text-xs text-indigo-300">{business.taxId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href="/audit-logs"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              View Workspace Audit Log
            </Link>
            {isOwner && (
              <Link
                href="/reports"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all"
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                View Reports & Analytics
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/invoices"
          className="glass-card p-4 text-center hover:bg-white/10 transition-all block"
        >
          <p className="text-xs text-gray-400">Total Invoices</p>
          <p className="text-xl font-extrabold text-white font-mono">{totalInvoices}</p>
          <p className="text-[10px] text-gray-600">{paidInvoices} paid • {unpaidInvoices} issued • {partialInvoices} partial</p>
        </Link>
        <Link
          href="/products"
          className="glass-card p-4 text-center hover:bg-white/10 transition-all block"
        >
          <p className="text-xs text-gray-400">Products</p>
          <p className="text-xl font-extrabold text-white font-mono">{totalProducts}</p>
          {lowStockCount > 0 && (
            <p className="text-[10px] text-amber-400">{lowStockCount} low stock</p>
          )}
        </Link>
        <Link
          href="/customers"
          className="glass-card p-4 text-center hover:bg-white/10 transition-all block"
        >
          <p className="text-xs text-gray-400">Customers</p>
          <p className="text-xl font-extrabold text-white font-mono">{totalCustomers}</p>
        </Link>
        <Link
          href="/reports"
          className="glass-card p-4 text-center hover:bg-white/10 transition-all block"
        >
          <p className="text-xs text-gray-400">Avg Invoice</p>
          <p className="text-xl font-extrabold text-indigo-400 font-mono">
            {totalInvoices > 0 ? fmt(totalSales._sum.totalAmount?.toNumber() ? totalSales._sum.totalAmount.toNumber() / totalInvoices : 0) : `${currencySymbol}0.00`}
          </p>
        </Link>
      </div>

      {/* Operational Quick Nav Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        <Link
          href="/pos"
          className="glass-card p-5 text-center hover:bg-white/5 transition-all text-white block group"
        >
          <ShoppingCart className="w-6 h-6 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-white text-sm">POS Terminal</p>
          <span className="text-[11px] text-indigo-300">New Sale / Checkout</span>
        </Link>

        <Link
          href="/invoices"
          className="glass-card p-5 text-center hover:bg-white/5 transition-all text-white block group"
        >
          <Receipt className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-white text-sm">Invoices</p>
          <span className="text-[11px] text-emerald-300">Billing & Payments</span>
        </Link>

        <Link
          href="/inventory"
          className="glass-card p-5 text-center hover:bg-white/5 transition-all text-white block group"
        >
          <Boxes className="w-6 h-6 text-teal-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-white text-sm">Inventory</p>
          <span className="text-[11px] text-teal-300">Stock & Movements</span>
        </Link>

        <Link
          href="/reports"
          className="glass-card p-5 text-center hover:bg-white/5 transition-all text-white block group"
        >
          <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-white text-sm">Reports</p>
          <span className="text-[11px] text-purple-300">Analytics & Insights</span>
        </Link>
      </div>
    </div>
  );
}
