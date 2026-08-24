import { requireBusinessContext, getUserBusinesses } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logout } from '@/actions/auth';
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
} from 'lucide-react';

export default async function DashboardPage() {
  const context = await requireBusinessContext();
  const businesses = await getUserBusinesses();
  const isOwner = context.role === 'OWNER' || context.role === 'ADMIN';

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
  });

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

          <form action={logout}>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI / Overview Card */}
        {isOwner ? (
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
                <span className="text-xs text-gray-400">Provisional Profit</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                  {business?.baseCurrency === 'INR' ? '₹' : '$'}0.00
                </p>
                <span className="text-[10px] text-gray-500">Net after COGS & OpEx</span>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-gray-400">Customer Receivables</span>
                <p className="text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
                  {business?.baseCurrency === 'INR' ? '₹' : '$'}0.00
                </p>
                <span className="text-[10px] text-gray-500">Unsettled credit sales</span>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-gray-400">Estimated Tax Liability</span>
                <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                  {business?.baseCurrency === 'INR' ? '₹' : '$'}0.00
                </p>
                <span className="text-[10px] text-gray-500">Output GST payable</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 italic">
              Estimated net asset snapshot based on recorded cash, inventory, receivables, liabilities, and available transactions.
            </p>
          </div>
        ) : (
          <div className="glass-card p-6 md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white">Staff Operational Dashboard</h2>
            <p className="text-sm text-gray-400">
              Welcome back! Use the operational modules below to process sales, check stock levels, and search customers.
            </p>
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              Note: Confidential financial metrics (Profitability, Margin, Tax Liability) are restricted to Owner and Admin roles.
            </div>
          </div>
        )}

        {/* Business Context Sidebar Card */}
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

          <div className="pt-2">
            <Link
              href="/audit-logs"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              View Workspace Audit Log
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Quick Nav Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        <div className="glass-card p-5 text-center opacity-75 hover:opacity-100 transition-opacity">
          <Package className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
          <p className="font-semibold text-white text-sm">Products</p>
          <span className="text-[11px] text-gray-400">Phase 2 Catalog</span>
        </div>

        <div className="glass-card p-5 text-center opacity-75 hover:opacity-100 transition-opacity">
          <Boxes className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-white text-sm">Inventory</p>
          <span className="text-[11px] text-gray-400">Phase 2 Stock Movements</span>
        </div>

        <div className="glass-card p-5 text-center opacity-75 hover:opacity-100 transition-opacity">
          <Receipt className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <p className="font-semibold text-white text-sm">Sales & Invoices</p>
          <span className="text-[11px] text-gray-400">Phase 3 POS & Billing</span>
        </div>

        <div className="glass-card p-5 text-center opacity-75 hover:opacity-100 transition-opacity">
          <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="font-semibold text-white text-sm">AI CA Insights</p>
          <span className="text-[11px] text-gray-400">Phase 7 Read-Only</span>
        </div>
      </div>
    </div>
  );
}
