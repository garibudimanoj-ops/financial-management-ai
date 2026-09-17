'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface ShellProps {
  children: ReactNode;
}

const AUTH_AND_PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/auth',
];

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile drawer on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const isAuthRoute =
    !pathname ||
    pathname === '/' ||
    AUTH_AND_PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-[#0b0f19]">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      {/* Persistent Desktop & Mobile Drawer Sidebar */}
      <Sidebar
        currentPath={pathname}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <TopBar
          currentPath={pathname}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
