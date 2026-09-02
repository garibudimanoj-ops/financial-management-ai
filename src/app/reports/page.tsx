import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowLeft,
  FileText,
  BarChart3,
  Package,
  Users,
  CreditCard,
  Boxes,
  Scale,
  DollarSign,
  PieChart,
  BookOpen,
} from 'lucide-react';

export default async function ReportsPage() {
  const context = await requireBusinessContext();

  const [
    business,
    totalCustomers,
    totalProducts,
    allProducts,
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    partialInvoices,
    totalPaymentsAgg,
    totalSalesAgg,
    todaySalesAgg,
    monthSalesAgg,
    outstandingReceivablesAgg,
    inventoryValueAgg,
  ] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true, name: true },
    }),
    prisma.customer.count({ where: { businessId: context.businessId, archived: false } }),
    prisma.product.count({ where: { businessId: context.businessId, archived: false } }),
    prisma.product.findMany({
      where: { businessId: context.businessId, archived: false },
      select: { stockQuantity: true, lowStockThreshold: true },
    }),
    prisma.invoice.count({ where: { businessId: context.businessId } }),
    prisma.invoice.count({ where: { businessId: context.businessId, status: 'PAID' } }),
    prisma.invoice.count({ where: { businessId: context.businessId, status: 'ISSUED' } }),
    prisma.invoice.count({ where: { businessId: context.businessId, status: 'PARTIALLY_PAID' } }),
    prisma.payment.aggregate({
      where: { businessId: context.businessId },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { businessId: context.businessId },
      _sum: { totalAmount: true },
    }),
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
        issueDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { totalAmount: true },
    }),
    prisma.customer.aggregate({
      where: { businessId: context.businessId },
      _sum: { currentBalance: true },
    }),
    prisma.product.aggregate({
      where: { businessId: context.businessId, archived: false },
      _sum: { stockQuantity: true },
    }),
  ]);

  const lowStockProducts = allProducts.filter((p) => p.stockQuantity.lessThanOrEqualTo(p.lowStockThreshold)).length;
  const totalPaymentsAmount = totalPaymentsAgg._sum.amount ? Number(totalPaymentsAgg._sum.amount) : null;
  const totalSalesAmount = totalSalesAgg._sum.totalAmount ? Number(totalSalesAgg._sum.totalAmount) : null;
  const todaySalesAmount = todaySalesAgg._sum.totalAmount ? Number(todaySalesAgg._sum.totalAmount) : null;
  const monthSalesAmount = monthSalesAgg._sum.totalAmount ? Number(monthSalesAgg._sum.totalAmount) : null;
  const outstandingReceivablesBalance = outstandingReceivablesAgg._sum.currentBalance ? Number(outstandingReceivablesAgg._sum.currentBalance) : null;
  const inventoryValueUnits = inventoryValueAgg._sum.stockQuantity ? Number(inventoryValueAgg._sum.stockQuantity) : null;

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: number | string | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const accountingReports = [
    { title: 'Trial Balance', desc: 'Double-entry debit/credit reconciliation across all accounts', href: '/reports/trial-balance', icon: Scale, color: 'text-indigo-400' },
    { title: 'Profit & Loss Statement', desc: 'Operating revenue, direct costs (COGS), gross & net income', href: '/reports/profit-loss', icon: TrendingUp, color: 'text-emerald-400' },
    { title: 'Balance Sheet', desc: 'Financial position: Total Assets = Total Liabilities + Equity', href: '/reports/balance-sheet', icon: PieChart, color: 'text-purple-400' },
    { title: 'Chart of Accounts', desc: 'Inspect active accounts, categories, and live ledger balances', href: '/api/accounts', icon: BookOpen, color: 'text-teal-400' },
  ];

  const operationalReports = [
    { title: 'Invoice Register', desc: 'Complete breakdown of invoices, GST tax, and payment status', href: '/api/reports/export?type=invoices', icon: FileText, color: 'text-amber-400' },
    { title: 'Payment Register', desc: 'Payment settlements by method (Cash, Bank, UPI, Card)', href: '/api/reports/export?type=payments', icon: CreditCard, color: 'text-emerald-400' },
    { title: 'Customer Aging Ledger', desc: 'Outstanding balances, credit terms, and customer history', href: '/api/reports/export?type=customers', icon: Users, color: 'text-blue-400' },
    { title: 'Inventory Valuation', desc: 'Stock quantities, weighted-average valuation, and low stock', href: '/inventory', icon: Boxes, color: 'text-pink-400' },
    { title: 'Product Performance', desc: 'Catalog sales performance and margins', href: '/api/reports/export?type=products', icon: Package, color: 'text-cyan-400' },
    { title: 'Statutory Audit Logs', desc: 'Immutable compliance trail of all mutations and financial changes', href: '/audit-logs', icon: BarChart3, color: 'text-gray-400' },
  ];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            Financial Reports & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            General Ledger statements, business intelligence, and compliance exports for {business?.name}
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Revenue</span>
          <p className="text-2xl font-extrabold text-indigo-400 font-mono">{fmt(totalSalesAmount)}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Today&apos;s Sales</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{fmt(todaySalesAmount)}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">This Month</span>
          <p className="text-2xl font-extrabold text-purple-400 font-mono">{fmt(monthSalesAmount)}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Outstanding Receivables</span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">{fmt(outstandingReceivablesBalance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Active Customers</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalCustomers}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Product Catalog</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalProducts}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Stock Units</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{inventoryValueUnits || 0}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Low Stock Alerts</span>
          <p className={`text-2xl font-extrabold font-mono ${lowStockProducts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {lowStockProducts}
          </p>
        </div>
      </div>

      {/* Statutory Accounting Statements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Statutory Financial Statements (CA Co-Pilot)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accountingReports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="glass-card p-5 space-y-2 hover:bg-white/10 transition-all group flex flex-col justify-between border border-indigo-500/20"
            >
              <div className="space-y-2">
                <report.icon className={`w-7 h-7 ${report.color}`} />
                <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {report.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">{report.desc}</p>
              </div>
              <span className="text-xs text-indigo-400 font-medium pt-2 inline-flex items-center gap-1">
                View Statement →
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Operational Reports */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Operational Registers & Exports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalReports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="glass-card p-5 space-y-2 hover:bg-white/10 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <report.icon className={`w-7 h-7 ${report.color}`} />
                <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {report.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">{report.desc}</p>
              </div>
              <span className="text-xs text-indigo-400 font-medium pt-2 inline-flex items-center gap-1">
                Open Export →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
