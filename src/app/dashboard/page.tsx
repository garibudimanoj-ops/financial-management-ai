import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import BusinessSwitcher from '@/components/BusinessSwitcher';
import Link from 'next/link';
import {
  Users,
  Settings as SettingsIcon,
  FileText,
  Package,
  Boxes,
  Receipt,
  LogOut,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ShoppingCart,
  CreditCard,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

export default async function DashboardPage() {
  const context = await requireBusinessContext();
  const businesses = await (await import('@/lib/auth')).getUserBusinesses();
  const isOwner = context.role === 'OWNER' || context.role === 'ADMIN';

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
  });

  const [
    totalProducts,
    totalCustomers,
    lowStockCount,
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    partialInvoices,
    totalSales,
    todaySales,
    monthSales,
    totalPayments,
    outstandingReceivables,
    inventoryValue,
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
        issueDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        businessId: context.businessId,
        issueDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({ where: { businessId: context.businessId }, _sum: { amount: true } }),
    prisma.customer.aggregate({ where: { businessId: context.businessId }, _sum: { currentBalance: true } }),
    prisma.product.aggregate({
      where: { businessId: context.businessId, archived: false },
      _sum: { stockQuantity: true },
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: number | string | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header / Navigation Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
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
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">Total Sales</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {fmt(totalSales._sum.totalAmount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-500">All recorded revenue</span>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">Customer Receivables</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
                {fmt(outstandingReceivables._sum.currentBalance?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-500">Unsettled credit sales</span>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">Payments Received</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {fmt(totalPayments._sum.amount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-500">Total collections</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">Today&apos;s Sales</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
                {fmt(todaySales._sum.totalAmount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-500">Since midnight</span>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">This Month</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">
                {fmt(monthSales._sum.totalAmount?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-500">Current billing cycle</span>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">Inventory Value</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {fmt(inventoryValue._sum.stockQuantity?.toNumber())}
              </p>
              <span className="text-[10px] text-gray-500">At weighted-average cost</span>
            </div>
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
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400">Total Invoices</p>
          <p className="text-xl font-extrabold text-white font-mono">{totalInvoices}</p>
          <p className="text-[10px] text-gray-500">{paidInvoices} paid • {unpaidInvoices} issued • {partialInvoices} partial</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400">Products</p>
          <p className="text-xl font-extrabold text-white font-mono">{totalProducts}</p>
          {lowStockCount > 0 && (
            <p className="text-[10px] text-amber-400">{lowStockCount} low stock</p>
          )}
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400">Customers</p>
          <p className="text-xl font-extrabold text-white font-mono">{totalCustomers}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-gray-400">Avg Invoice</p>
          <p className="text-xl font-extrabold text-indigo-400 font-mono">
            {totalInvoices > 0 ? fmt(totalSales._sum.totalAmount?.toNumber() ? totalSales._sum.totalAmount.toNumber() / totalInvoices : 0) : `${currencySymbol}0.00`}
          </p>
        </div>
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
