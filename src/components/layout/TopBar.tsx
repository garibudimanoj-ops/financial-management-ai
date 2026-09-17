'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Menu, ArrowLeft, Bot, Settings, LogOut } from 'lucide-react';
import Breadcrumb from './Breadcrumb';
import { logout } from '@/actions/auth';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  currentPath?: string;
  onOpenMobile?: () => void;
  children?: ReactNode;
}

export default function TopBar({
  title,
  showBack = false,
  backHref = '/dashboard',
  onOpenMobile,
  children,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0e1422]/90 backdrop-blur-md border-b border-slate-800/80 shrink-0">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Left Section: Mobile Drawer Trigger + Breadcrumb / Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobile && (
            <button
              onClick={onOpenMobile}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {showBack && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          )}

          {title ? (
            <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
              {title}
            </h2>
          ) : (
            <Breadcrumb />
          )}
        </div>

        {/* Right Section: Actions & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {children}

          {/* Quick link to CA Copilot */}
          <Link
            href="/ca-assistant"
            title="Open CA Copilot"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>CA Copilot</span>
          </Link>

          {/* Quick link to Settings */}
          <Link
            href="/settings"
            title="Settings"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Logout Action */}
          <form action={logout}>
            <button
              type="submit"
              title="Sign Out"
              className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
