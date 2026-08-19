'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Server,
  ShieldAlert,
  X,
} from 'lucide-react';
import { SuperAdminSidebarNav } from './super-admin-nav';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

const adminPageNames: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/merchants': 'Merchants & Workspaces',
  '/admin/agents': 'Agent Fleet & LLMs',
  '/admin/voice-studio': 'Voice Edge Studio',
  '/admin/telephony': 'Telephony & WebRTC',
  '/admin/health': 'Cluster Health & Logs',
};

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const title = adminPageNames[pathname] || 'Super Admin';

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden shrink-0 transition-[width] duration-300 md:block',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <SuperAdminSidebarNav isCollapsed={isCollapsed} />
      </div>

      {/* Main Content Pane */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-background/95 px-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile Nav Trigger */}
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              className="hidden size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground md:grid"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Super Admin
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cluster Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cluster Active (4 Nodes)
            </div>

            <ThemeToggle />

            {/* Internal Operator Badge */}
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-medium text-foreground">
              <div className="flex size-5 items-center justify-center rounded bg-accent-600 font-bold text-white text-[10px]">
                SA
              </div>
              <span className="hidden sm:inline">Internal Team</span>
            </div>
          </div>
        </header>

        {/* Scrollable Body Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-[var(--surface-navigation)] shadow-xl">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <SuperAdminSidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
