'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  pos: 'POS Terminal',
  customers: 'Customers',
  payments: 'Payments',
  purchases: 'Purchases',
  suppliers: 'Suppliers',
  inventory: 'Inventory',
  products: 'Products',
  expenses: 'Expenses',
  reports: 'Reports',
  'audit-logs': 'Audit Logs',
  'ca-assistant': 'CA Copilot',
  settings: 'Settings',
  employees: 'Team Members',
  new: 'New',
  edit: 'Edit',
};

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  let breadcrumbs = items;

  if (!breadcrumbs) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0 || segments[0] === 'dashboard') {
      breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }];
    } else {
      breadcrumbs = [
        { label: 'Dashboard', href: '/dashboard' },
        ...segments.map((seg, idx) => {
          const href = `/${segments.slice(0, idx + 1).join('/')}`;
          const label =
            ROUTE_NAME_MAP[seg] ||
            (seg.length > 15 ? `${seg.slice(0, 8)}...` : seg.replace(/-/g, ' '));
          const isLast = idx === segments.length - 1;
          return {
            label: label.charAt(0).toUpperCase() + label.slice(1),
            href: isLast ? undefined : href,
          };
        }),
      ];
    }
  }

  return (
    <nav className={cn('flex items-center text-xs text-slate-400', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" aria-hidden="true" />}
              {index === 0 && (
                <Link
                  href="/dashboard"
                  className="text-slate-400 hover:text-slate-200 p-0.5 transition-colors"
                  aria-label="Home"
                >
                  <Home className="w-3.5 h-3.5" />
                </Link>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-slate-400 hover:text-indigo-400 transition-colors truncate max-w-[150px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn('truncate max-w-[180px]', isLast ? 'font-semibold text-slate-200' : 'text-slate-400')}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
