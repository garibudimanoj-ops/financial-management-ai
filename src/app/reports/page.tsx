import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  TrendingUp,
  FileText,
  BarChart3,
  Package,
  Users,
  CreditCard,
  Boxes,
  Scale,
  PieChart,
  BookOpen,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';

export default async function ReportsPage() {
  const context = await requireBusinessContext();

  const [
    business,
    totalCustomers,
    totalProducts,
    allProducts,
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
  const totalSalesAmount = totalSalesAgg._sum.totalAmount ? Number(totalSalesAgg._sum.totalAmount) : null;
  const todaySalesAmount = todaySalesAgg._sum.totalAmount ? Number(todaySalesAgg._sum.totalAmount) : null;
  const monthSalesAmount = monthSalesAgg._sum.totalAmount ? Number(monthSalesAgg._sum.totalAmount) : null;
  const outstandingReceivablesBalance = outstandingReceivablesAgg._sum.currentBalance ? Number(outstandingReceivablesAgg._sum.currentBalance) : null;
  const inventoryValueUnits = inventoryValueAgg._sum.stockQuantity ? Number(inventoryValueAgg._sum.stockQuantity) : 0;

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: number | string | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const accountingReports = [
    { title: 'Trial Balance', desc: 'Double-entry debit/credit reconciliation across all general ledger accounts', href: '/reports/trial-balance', icon: Scale, color: 'text-indigo-400', badge: 'Audit Ready' },
    { title: 'Profit & Loss Statement', desc: 'Operating revenue, direct costs (COGS), gross margin, and net income', href: '/reports/profit-loss', icon: TrendingUp, color: 'text-emerald-400', badge: 'Income' },
    { title: 'Balance Sheet', desc: 'Financial position: Total Assets = Total Liabilities + Owner Equity', href: '/reports/balance-sheet', icon: PieChart, color: 'text-purple-400', badge: 'Position' },
    { title: 'Chart of Accounts', desc: 'Inspect active nominal, real, and personal ledger codes and balances', href: '/api/accounts', icon: BookOpen, color: 'text-cyan-400', badge: 'Ledger' },
  ];

  const operationalReports = [
    { title: 'Invoice Register', desc: 'Complete breakdown of customer invoices, GST tax breakdown, and payment status', href: '/api/reports/export?type=invoices', icon: FileText, color: 'text-amber-400' },
    { title: 'Payment Register', desc: 'Settlements log by payment instrument (Cash, Bank Transfer, UPI, Card)', href: '/api/reports/export?type=payments', icon: CreditCard, color: 'text-emerald-400' },
    { title: 'Customer Aging Ledger', desc: 'Outstanding balances, credit terms, and customer payment history', href: '/api/reports/export?type=customers', icon: Users, color: 'text-blue-400' },
    { title: 'Inventory Valuation', desc: 'Stock quantities, weighted-average cost valuation, and turnover metrics', href: '/inventory', icon: Boxes, color: 'text-pink-400' },
    { title: 'Product Performance', desc: 'Catalog sales performance, margins, and movement velocity', href: '/api/reports/export?type=products', icon: Package, color: 'text-teal-400' },
    { title: 'Statutory Audit Logs', desc: 'Immutable compliance trail of all system mutations and financial changes', href: '/audit-logs', icon: BarChart3, color: 'text-slate-400' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Financial Reports & Analytics"
        subtitle={`General Ledger statements, business intelligence, and compliance exports for ${business?.name || 'Workspace'}`}
        icon={<BarChart3 className="w-6 h-6 text-indigo-400" />}
      />

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Lifetime Revenue"
          value={fmt(totalSalesAmount)}
          description="Cumulative invoice total"
          icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
        />
        <MetricCard
          title="Today's Sales"
          value={fmt(todaySalesAmount)}
          description="Processed since midnight"
          icon={<Calendar className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="This Month Revenue"
          value={fmt(monthSalesAmount)}
          description="Current calendar month"
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
        />
        <MetricCard
          title="Outstanding Receivables"
          value={fmt(outstandingReceivablesBalance)}
          description="Uncollected customer balances"
          icon={<CreditCard className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Operational Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Customers"
          value={totalCustomers.toString()}
          description="Customers in directory"
          icon={<Users className="w-5 h-5 text-blue-400" />}
        />
        <MetricCard
          title="Product Catalog"
          value={totalProducts.toString()}
          description="Active SKU items"
          icon={<Package className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Stock Units on Hand"
          value={inventoryValueUnits.toLocaleString()}
          description="Current physical inventory"
          icon={<Boxes className="w-5 h-5 text-pink-400" />}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={lowStockProducts.toString()}
          description={lowStockProducts > 0 ? "Requires re-order" : "All SKUs healthy"}
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Statutory Accounting Statements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-100">Statutory Financial Statements (CA Co-Pilot)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accountingReports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="glass-card-interactive p-5 flex flex-col justify-between group rounded-xl border border-indigo-500/20 bg-slate-900/60 hover:border-indigo-500/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <report.icon className={`w-5 h-5 ${report.color}`} />
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                    {report.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{report.desc}</p>
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                <span>View Statement</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Operational Reports */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-100">Operational Registers & Data Exports</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalReports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
              className="glass-card-interactive p-5 flex flex-col justify-between group rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                  <report.icon className={`w-5 h-5 ${report.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{report.desc}</p>
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-slate-200">
                <span>Open Export</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
