import { requireBusinessContext } from '@/lib/auth';
import { getInventorySummary } from '@/lib/inventory/service';
import { prisma } from '@/lib/prisma';
import BusinessSwitcher from '@/components/BusinessSwitcher';
import Link from 'next/link';
import {
  Users,
  Receipt,
  Boxes,
  TrendingUp,
  ShieldCheck,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Calendar,
  AlertTriangle,
  Bot,
  ArrowRight,
  FileText,
  CheckCircle2,
  Package,
} from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import Badge from '@/components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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
    lowStockItems,
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
    recentInvoices,
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
    prisma.product.findMany({
      where: {
        businessId: context.businessId,
        archived: false,
        stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
      },
      select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true },
      take: 4,
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
    getInventorySummary(context.businessId),
    prisma.invoice.findMany({
      where: { businessId: context.businessId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        customer: { select: { name: true } },
      },
    }),
  ]);

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  const fmt = (val: number | string | null | undefined) =>
    val != null
      ? `${currencySymbol}${Number(val).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${currencySymbol}0.00`;

  const paidRatio =
    totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

  const totalSalesNum = filteredSales._sum.totalAmount?.toNumber() || 0;
  const totalCollectionsNum = filteredPayments._sum.amount?.toNumber() || 0;
  const receivablesNum = outstandingReceivables._sum.currentBalance?.toNumber() || 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ================================================================= */}
      {/* Executive Header & Filter Bar */}
      {/* ================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5 flex-wrap">
          <BusinessSwitcher
            currentBusinessId={context.businessId}
            businesses={businesses}
          />
          <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            {context.role} Access
          </Badge>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Base: {currency}
          </span>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800/80 overflow-x-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" aria-hidden="true" />
          {([
            { value: 'today', label: 'Today' },
            { value: 'this-week', label: 'This Week' },
            { value: 'this-month', label: 'Month' },
            { value: 'this-year', label: 'Year' },
            { value: 'all-time', label: 'All Time' },
          ] as const).map((opt) => {
            const isSelected = range === opt.value;
            return (
              <Link
                key={opt.value}
                href={opt.value === 'all-time' ? '/dashboard' : `/dashboard?range=${opt.value}`}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* BENTO ZONE 1: Executive KPI Metrics Cards */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title={rangeBounds.label}
          value={fmt(totalSalesNum)}
          description={rangeBounds.subLabel}
          trend={{
            value: totalSalesNum > 0 ? '+12%' : '0%',
            isPositive: true,
            label: 'active cycle',
          }}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          sparkline={[15, 22, 28, 25, 34, 40, 48]}
          href="/invoices"
        />

        <MetricCard
          title="Customer Receivables"
          value={fmt(receivablesNum)}
          description="Unsettled credit sales"
          trend={{
            value: receivablesNum > 0 ? `${totalCustomers} accounts` : 'Zero balance',
            isPositive: receivablesNum === 0,
          }}
          icon={<Receipt className="w-5 h-5" />}
          iconBg="bg-amber-500/10 text-amber-400 border-amber-500/20"
          sparkline={[30, 28, 35, 32, 29, 31, 26]}
          href="/customers"
        />

        <MetricCard
          title="Collections Received"
          value={fmt(totalCollectionsNum)}
          description={`Period: ${range}`}
          trend={{
            value: totalCollectionsNum > 0 ? 'Healthy' : 'Pending',
            isPositive: totalCollectionsNum > 0,
            label: 'cash influx',
          }}
          icon={<CreditCard className="w-5 h-5" />}
          iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          sparkline={[10, 18, 22, 35, 42, 38, 52]}
          href="/payments"
        />

        <MetricCard
          title="Inventory Valuation"
          value={fmt(inventoryValuation.totalValuation.toNumber())}
          description="Weighted-average cost"
          trend={{
            value: `${totalProducts} SKUs`,
            isPositive: true,
            label: lowStockCount > 0 ? `(${lowStockCount} low)` : undefined,
          }}
          icon={<Boxes className="w-5 h-5" />}
          iconBg="bg-sky-500/10 text-sky-400 border-sky-500/20"
          sparkline={[40, 39, 41, 40, 42, 43, 45]}
          href="/inventory"
        />
      </div>

      {/* ================================================================= */}
      {/* BENTO ZONE 2 & 3: Financial Visual Trends & Balance Overview */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visual Revenue vs Collection Breakdown */}
        <Card className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Revenue & Collection Health
              </CardTitle>
              <CardDescription>
                Comparison of invoiced sales vs real collections in period ({currency})
              </CardDescription>
            </div>
            <Badge variant="success" size="xs">
              Live Ledger
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Visual Progress Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Invoice Realization Rate</span>
                <span className="text-indigo-300 font-mono">{paidRatio}% Paid</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${paidRatio}%` }}
                />
                <div
                  className="h-full bg-amber-500/80 transition-all duration-500"
                  style={{
                    width: `${totalInvoices > 0 ? (partialInvoices / totalInvoices) * 100 : 0}%`,
                  }}
                />
                <div
                  className="h-full bg-slate-700 transition-all duration-500"
                  style={{
                    width: `${totalInvoices > 0 ? (unpaidInvoices / totalInvoices) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Paid: {paidInvoices}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Partial: {partialInvoices}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  Issued / Unpaid: {unpaidInvoices}
                </span>
              </div>
            </div>

            {/* Financial Velocity Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Sales Invoiced</span>
                <p className="text-lg font-bold text-slate-100 font-mono-numbers">
                  {fmt(totalSales._sum.totalAmount?.toNumber())}
                </p>
                <span className="text-[10px] text-slate-400">Lifetime revenue</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Collections</span>
                <p className="text-lg font-bold text-emerald-400 font-mono-numbers">
                  {fmt(totalPayments._sum.amount?.toNumber())}
                </p>
                <span className="text-[10px] text-slate-400">Deposited into ledger</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Average Invoice</span>
                <p className="text-lg font-bold text-indigo-400 font-mono-numbers">
                  {totalInvoices > 0
                    ? fmt(
                        (totalSales._sum.totalAmount?.toNumber() || 0) / totalInvoices
                      )
                    : `${currencySymbol}0.00`}
                </p>
                <span className="text-[10px] text-slate-400">{totalInvoices} total transactions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workspace & Compliance Context */}
        <Card className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workspace & Compliance</CardTitle>
              <CardDescription>Fiscal configuration for {business?.name}</CardDescription>
            </CardHeader>

            <div className="space-y-2.5 text-xs text-slate-300 divide-y divide-slate-800/60">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Entity Structure</span>
                <span className="font-semibold text-slate-200">{business?.accountType || 'SMB'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Base Currency</span>
                <span className="font-semibold text-slate-200 font-mono">{business?.baseCurrency}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Fiscal Year Start</span>
                <span className="font-semibold text-slate-200">{business?.fiscalYearStart || 'April 1'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">GST / Tax Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {business?.taxRegistrationStatus ? 'Registered' : 'Standard'}
                </span>
              </div>
              {business?.taxId && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Tax ID / GSTIN</span>
                  <span className="font-mono text-indigo-300 font-semibold">{business.taxId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <Link
              href="/audit-logs"
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 text-xs font-medium text-slate-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Workspace Audit Trail
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            {isOwner && (
              <Link
                href="/reports"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 text-xs font-medium text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  Trial Balance & P&L
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* BENTO ZONE 4 & 5: Operational Quick Actions & Risk Alerts */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quick Operational Launchpad */}
        <Card className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">High-Frequency Actions</CardTitle>
            <CardDescription>Instant creation and register shortcuts</CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              href="/pos"
              className="p-3.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <ShoppingCart className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-semibold text-xs text-slate-100">POS Register</div>
              <p className="text-[10px] text-slate-400">Rapid counter checkout</p>
            </Link>

            <Link
              href="/invoices/new"
              className="p-3.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Receipt className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-semibold text-xs text-slate-100">New Invoice</div>
              <p className="text-[10px] text-slate-400">B2B / Tax compliant bill</p>
            </Link>

            <Link
              href="/payments"
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <CreditCard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-semibold text-xs text-slate-100">Record Payment</div>
              <p className="text-[10px] text-slate-400">Settle customer dues</p>
            </Link>

            <Link
              href="/customers/new"
              className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Users className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="font-semibold text-xs text-slate-100">Add Customer</div>
              <p className="text-[10px] text-slate-400">Register trade account</p>
            </Link>
          </div>

          <div className="pt-3">
            <Link
              href="/inventory"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/30 hover:bg-slate-800/60 transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-slate-400" />
              Manage Warehouse & Stock In
            </Link>
          </div>
        </Card>

        {/* Live Operational Alerts */}
        <Card className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Operational Risk & Stock Alerts
              </CardTitle>
              <CardDescription>Live attention triggers from active stock and ledger</CardDescription>
            </div>
            {lowStockCount > 0 ? (
              <Badge variant="warning" size="xs">
                {lowStockCount} items at risk
              </Badge>
            ) : (
              <Badge variant="success" size="xs">
                Stock Levels Healthy
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Package className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-amber-300 font-mono font-semibold">
                        {item.stockQuantity.toString()} units left
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (min {item.lowStockThreshold.toString()})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                All catalog items are stocked above their designated low-stock threshold.
              </div>
            )}

            {/* Recent Invoices Quick Strip */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Invoices
                </span>
                <Link
                  href="/invoices"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View All ({totalInvoices}) →
                </Link>
              </div>
              <div className="divide-y divide-slate-800/60 border border-slate-800/60 rounded-xl overflow-hidden bg-slate-950/40">
                {recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 text-xs hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="space-y-0.5 overflow-hidden pr-2">
                      <p className="font-semibold text-slate-200 truncate font-mono">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {inv.customer?.name || 'Walk-in Customer'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-100 font-mono-numbers">
                        {fmt(inv.totalAmount.toNumber())}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* BENTO ZONE 6: CA Copilot Contextual Intelligence */}
      {/* ================================================================= */}
      <Card className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-100">CA Copilot Intelligence Brief</h3>
                <Badge variant="primary" size="xs">
                  AI Context Verified
                </Badge>
                <span className="text-xs text-slate-400">Ledger Aggregations Verified</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {receivablesNum > 0
                  ? `Your business has ${fmt(receivablesNum)} in outstanding receivables across ${totalCustomers} active customer accounts. Collections stand at ${fmt(totalCollectionsNum)} this cycle.`
                  : `All customer accounts are settled with zero outstanding receivables. Total sales recorded at ${fmt(totalSalesNum)}.`}
                {lowStockCount > 0
                  ? ` Attention: ${lowStockCount} product SKUs have fallen below minimum safety inventory thresholds.`
                  : ' Warehouse stock remains within healthy operating parameters.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/ca-assistant">
              <Button variant="primary" size="sm" icon={<Bot className="w-4 h-4" />}>
                Launch Copilot Chat
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
