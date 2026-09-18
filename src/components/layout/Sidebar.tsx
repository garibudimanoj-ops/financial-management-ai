'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Building2,
  Boxes,
  Package,
  Wallet,
  BarChart3,
  ShieldCheck,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Sales & Billing',
    items: [
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/pos', label: 'POS Terminal', icon: ShoppingCart },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    title: 'Purchases & Inventory',
    items: [
      { href: '/purchases', label: 'Purchases', icon: Truck },
      { href: '/suppliers', label: 'Suppliers', icon: Building2 },
      { href: '/inventory', label: 'Inventory', icon: Boxes },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    title: 'Intelligence & Audit',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
      { href: '/ca-assistant', label: 'CA Copilot', icon: Bot, badge: 'AI' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  currentPath: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  currentPath,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          'fixed left-0 top-0 h-full bg-[#0d111c] border-r border-slate-800/80 z-50 flex flex-col transition-all duration-300 ease-in-out',
          // Desktop sizing
          collapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile translation
          mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header / Brand */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80 shrink-0">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 overflow-hidden group focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-950 font-bold text-sm tracking-wider">
              TT
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex items-center gap-1.5 transition-opacity duration-200">
                <span className="font-bold text-slate-100 text-base tracking-tight group-hover:text-indigo-400 transition-colors">
                  TaskTally
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="flex lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto overflow-x-hidden">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (!collapsed || mobileOpen) && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive =
                  currentPath === item.href ||
                  (item.href !== '/dashboard' && currentPath.startsWith(item.href));

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all group relative',
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border-l-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    {(!collapsed || mobileOpen) && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {item.badge && (!collapsed || mobileOpen) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Workspace Status */}
        {(!collapsed || mobileOpen) && (
          <div className="p-3 border-t border-slate-800/80 shrink-0">
            <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
              <div className="space-y-0.5 overflow-hidden">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                  Status
                </p>
                <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ledger Synced
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
