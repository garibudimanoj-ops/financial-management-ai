import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowLeft,
  FileText,
  Download,
  BarChart3,
  Package,
  Users,
  Receipt,
  CreditCard,
  Boxes,
  AlertTriangle,
} from 'lucide-react';

export default async function ReportsPage() {
  const context = await requireBusinessContext();

  const [
    business,
    totalCustomers,
    totalProducts,
    lowStockProducts,
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

  const reports = [
    { title: 'Sales Report', desc: 'Revenue trends, top products, and sales metrics', href: '#', icon: TrendingUp, color: 'text-indigo-400' },
    { title: 'Invoice Report', desc: 'Invoice status breakdown and totals', href: '#', icon: FileText, color: 'text-amber-400' },
    { title: 'Payment Report', desc: 'Payment methods, dates, and reconciliation', href: '#', icon: CreditCard, color: 'text-emerald-400' },
    { title: 'Customer Ledger', desc: 'Outstanding receivables and payment history', href: '#', icon: Users, color: 'text-purple-400' },
    { title: 'Inventory Report', desc: 'Stock levels, valuation, and movement', href: '#', icon: Boxes, color: 'text-teal-400' },
    { title: 'Product Report', desc: 'Product performance and catalog analysis', href: '#', icon: Package, color: 'text-pink-400' },
    { title: 'Audit Log Report', desc: 'Compliance and activity tracking', href: '/audit-logs', icon: BarChart3, color: 'text-gray-400' },
  ];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            Reports & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Business intelligence and financial reporting for {business?.name}
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
          <span className="text-xs text-gray-400 font-medium">Outstanding</span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono">{fmt(outstandingReceivablesBalance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Customers</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalCustomers}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Products</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalProducts}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Inventory Value</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{fmt(inventoryValueUnits)}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Low Stock Alerts</span>
          <p className={`text-2xl font-extrabold font-mono ${lowStockProducts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {lowStockProducts}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Invoices</span>
          <p className="text-2xl font-extrabold text-white font-mono">{totalInvoices}</p>
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-400">Paid: {paidInvoices}</span>
            <span className="text-indigo-400">Issued: {unpaidInvoices}</span>
            <span className="text-amber-400">Partial: {partialInvoices}</span>
          </div>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Payments</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">{fmt(totalPaymentsAmount)}</p>
        </div>
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Avg Invoice Value</span>
          <p className="text-2xl font-extrabold text-indigo-400 font-mono">
            {totalInvoices > 0 && totalSalesAmount ? fmt(totalSalesAmount / totalInvoices) : `${currencySymbol}0.00`}
          </p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Available Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="glass-card p-5 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <report.icon className={`w-5 h-5 ${report.color}`} />
                <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                  {report.title}
                </h3>
              </div>
              <p className="text-xs text-gray-400">{report.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
