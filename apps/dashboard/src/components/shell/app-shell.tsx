'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  Command,
  Sparkles,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { SidebarNav, WorkspaceTabs } from './nav';
import { useSession } from '@/lib/session';
import { ThemeToggle } from './theme-toggle';
import { DashboardMotion } from './dashboard-motion';

function ProfileDropdown() {
  const { organizations, organization, selectOrganization, signOut } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const current = organization ? organization.name : 'Voomate Workspace';
  const initial = current.charAt(0);

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-[13px] shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
      >
        {initial}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[44px] right-0 z-50 flex w-[280px] flex-col rounded-xl border border-border bg-card py-2 shadow-overlay animate-in fade-in slide-in-from-top-2 duration-100">
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Current workspace
            </div>

            <div className="mx-2 mb-1 flex flex-col rounded-lg border border-border bg-ink-50 px-3 py-2 dark:bg-ink-800/60">
              <span className="text-[13px] font-semibold text-foreground truncate">{current}</span>
              <span className="text-[11px] text-muted-foreground">Free Plan</span>
            </div>

            <div className="mt-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Switch workspace
            </div>
            <div className="max-h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden">
              {organizations.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => {
                    selectOrganization(ws.id);
                    setIsOpen(false);
                  }}
                  className={`mx-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${organization?.id === ws.id ? 'bg-accent-50 font-semibold text-accent-700 dark:bg-accent-950/50 dark:text-accent-200' : 'font-medium text-foreground/80 hover:bg-ink-100 dark:hover:bg-ink-800'}`}
                >
                  {ws.name}
                </div>
              ))}
            </div>

            <div className="my-2 border-t border-border/50" />

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="px-3 py-2 mx-2 flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:bg-muted/50 rounded-lg cursor-pointer transition-all"
            >
              <Settings className="w-[15px] h-[15px]" strokeWidth={2} />
              Settings
            </Link>
            <div
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="px-3 py-2 mx-2 flex items-center gap-2.5 text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all mt-1"
            >
              <LogOut className="w-[15px] h-[15px]" strokeWidth={2} />
              Log out
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { organization } = useSession();
  const pathname = usePathname();

  return (
    <div className="dashboard-shell flex h-screen w-full overflow-hidden bg-background font-sans">
      <DashboardMotion />
      {/* Sidebar */}
      <div
        className={`h-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <SidebarNav
          className="w-[260px] border-none bg-transparent"
          onSearchClick={() => setIsSearchOpen(true)}
        />
      </div>

      {/* Main Content */}
      <div className="dashboard-main flex min-w-0 flex-1 flex-col bg-ink-50/50 transition-all duration-300 dark:bg-ink-950/30">
        {/* Top Header */}
        <div className="dashboard-topbar relative z-50 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
            >
              {isOpen ? (
                <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
            </button>
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <Link href="/" className="truncate hover:text-foreground transition-colors">
                {organization?.name || 'Voomate Workspace'}
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground truncate">
                {pathname === '/'
                  ? 'Dashboard'
                  : pathname
                      .split('/')
                      .filter(Boolean)
                      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                      .join(' / ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-ink-100 hover:text-foreground dark:hover:bg-ink-800 md:flex"
            >
              <Sparkles className="w-4 h-4" />
              Command
            </button>

            <div className="h-4 w-[1px] bg-border/50 hidden sm:block mx-1" />

            <button
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-ink-100 hover:text-foreground dark:hover:bg-ink-800"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-card" />
            </button>

            <ThemeToggle />

            <ProfileDropdown />
          </div>
        </div>

        <WorkspaceTabs />

        {/* Children Area */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-overlay animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 border-b border-border/50">
              <Search
                className="w-[18px] h-[18px] text-muted-foreground/70 mr-3 shrink-0"
                strokeWidth={1.5}
              />
              <input
                autoFocus
                className="flex-1 bg-transparent py-4 outline-none text-[14px] text-foreground placeholder:text-muted-foreground/50"
                placeholder="Search agents, conversations, or actions..."
              />
              <kbd
                onClick={() => setIsSearchOpen(false)}
                className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 ml-2 text-[10px] font-medium font-mono text-muted-foreground/70 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-[4px] cursor-pointer hover:text-foreground hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
              >
                ESC
              </kbd>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="ml-3 p-1 rounded-md text-muted-foreground/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-2 py-8 flex flex-col items-center justify-center">
              <Command className="w-6 h-6 text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-muted-foreground">
                Search will become available as your workspace grows.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
