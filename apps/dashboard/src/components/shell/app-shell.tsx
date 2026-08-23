'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from 'lucide-react';
import { SidebarNav } from './nav';
import { useSession } from '@/lib/session';
import { ThemeToggle } from './theme-toggle';
import { DashboardMotion } from './dashboard-motion';
import { cn } from '@/lib/cn';

const pageNames: Record<string, string> = {
  '/': 'Overview',
  '/overview': 'Overview',
  '/agents': 'Agents',
  '/conversations': 'Inbox',
  '/integrations': 'Connections',
  '/logs': 'Activity',
  '/feedback': 'Feedback',
  '/approvals': 'Approvals',
  '/usage': 'Usage',
  '/settings': 'Settings',
};

function currentPageName(pathname: string) {
  const exact = pageNames[pathname];
  if (exact) return exact;
  const parent = Object.entries(pageNames).find(
    ([path]) => path !== '/' && pathname.startsWith(`${path}/`),
  );
  return parent?.[1] ?? 'Workspace';
}

function ProfileDropdown() {
  const { email, organization, signOut } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const current = organization?.name ?? 'Voomate Workspace';
  const identity = email || current;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Open account menu"
        aria-expanded={isOpen}
        className="group flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] p-1.5 pr-2 text-[13px] font-semibold text-foreground transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--surface-hover)] active:translate-y-px"
      >
        <span className="grid size-6 place-items-center rounded-md bg-foreground text-[11px] text-background">
          {identity.charAt(0).toUpperCase()}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-y-0.5" />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close account menu"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-11 right-0 z-40 w-64 rounded-lg bg-card p-2 shadow-overlay">
            <div className="rounded-lg bg-[var(--surface-sunken)] px-3 py-3">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {email || current}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{current}</p>
            </div>

            <div className="mt-2 space-y-1">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground"
              >
                <Settings className="size-4" />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-critical transition-colors hover:bg-critical-soft dark:hover:bg-red-950/30"
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const pageName = currentPageName(pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div
      className={cn(
        'dashboard-layout flex h-[100dvh] w-full overflow-hidden bg-background text-foreground',
        'transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:grid',
        desktopOpen ? 'md:grid-cols-[17.5rem_1fr]' : 'md:grid-cols-[4.5rem_1fr]',
      )}
    >
      <DashboardMotion />

      {/* Sidebar wrapper */}
      <div
        className={cn(
          'hidden min-w-0 overflow-hidden md:block transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          desktopOpen ? 'w-[17.5rem]' : 'w-[4.5rem]',
        )}
      >
        <SidebarNav className="w-full" isCollapsed={!desktopOpen} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[min(19rem,86vw)] shadow-overlay">
            <SidebarNav className="w-full" onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:hover:bg-white/[0.06]"
            >
              <X className="size-[18px]" />
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-main flex min-w-0 flex-1 flex-col">
        <header className="dashboard-topbar relative z-30 flex h-16 shrink-0 items-center justify-between bg-background px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground md:hidden"
            >
              <Menu className="size-[19px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setDesktopOpen((value) => !value)}
              aria-label={desktopOpen ? 'Hide navigation' : 'Show navigation'}
              className="hidden size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground md:grid"
            >
              {desktopOpen ? (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.7} />
              ) : (
                <PanelLeftOpen className="size-[18px]" strokeWidth={1.7} />
              )}
            </button>
            <h1 className="truncate text-[15px] font-semibold text-foreground">{pageName}</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </header>

        <div
          id="dashboard-content"
          className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
