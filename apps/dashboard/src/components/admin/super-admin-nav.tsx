'use client';

import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Bot, Building2, Mic, PhoneCall, Server } from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  title: string;
  href: string;
  icon: ElementType;
  badge?: string;
};

const governanceItems: NavItem[] = [
  { title: 'Merchants & Workspaces', href: '/admin/merchants', icon: Building2 },
  { title: 'Agent Fleet & LLMs', href: '/admin/agents', icon: Bot },
];

const voiceEdgeItems: NavItem[] = [
  { title: 'Voice Edge Studio', href: '/admin/voice-studio', icon: Mic },
  { title: 'Telephony & WebRTC', href: '/admin/telephony', icon: PhoneCall },
];

const infraItems: NavItem[] = [
  { title: 'Cluster Health & Logs', href: '/admin/health', icon: Server },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/admin' && (pathname === '/admin' || pathname === '/admin/merchants')) {
    return true;
  }
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({
  item,
  pathname,
  onNavigate,
  isCollapsed,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-active={active}
      className={cn(
        'dashboard-nav-link group relative flex min-h-11 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-[13.5px] font-medium transition-[background-color,color,transform,box-shadow] duration-300 ease-out active:translate-y-px',
        active
          ? 'bg-white text-foreground shadow-[0_1px_0_rgba(20,20,18,0.035),0_7px_18px_rgba(20,20,18,0.04)] dark:bg-white/[0.075] dark:shadow-none font-semibold'
          : 'text-muted-foreground hover:translate-x-0.5 hover:bg-white/75 hover:text-foreground dark:hover:bg-white/[0.05]',
        isCollapsed && 'justify-center px-0 hover:translate-x-0',
      )}
      title={isCollapsed ? item.title : undefined}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-md transition-colors duration-300',
          active
            ? 'bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-200'
            : 'text-muted-foreground group-hover:bg-[var(--surface-sunken)] group-hover:text-foreground',
        )}
      >
        <item.icon className="size-4 shrink-0" strokeWidth={2} />
      </span>
      <span className={cn('truncate', isCollapsed && 'hidden')}>{item.title}</span>
      {item.badge && !isCollapsed && (
        <span className="ml-auto rounded-full bg-accent-100 dark:bg-accent-950 px-2 py-0.5 text-[10px] font-bold text-accent-700 dark:text-accent-300">
          {item.badge}
        </span>
      )}
      {active && !item.badge && <span className="ml-auto size-1.5 rounded-full bg-accent-500" />}
    </Link>
  );
}

function NavigationGroup({
  label,
  items,
  pathname,
  onNavigate,
  isCollapsed,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  return (
    <div>
      {label && !isCollapsed && (
        <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            key={item.href}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </div>
  );
}

export function SuperAdminSidebarNav({
  className,
  isCollapsed,
  onNavigate,
}: {
  className?: string;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'dashboard-sidebar flex h-full flex-col bg-[var(--surface-navigation)] px-3 py-4',
        className,
      )}
    >
      {/* Brand Header with Super Admin Badge */}
      <div className={cn('mb-6 flex flex-col gap-1.5', isCollapsed ? 'items-center' : 'px-2')}>
        <Link href="/admin/merchants" onClick={onNavigate} className="flex items-center gap-2">
          <img src="/voomate-logo.png" alt="Voomate" className="h-8 w-auto dark:invert" />
          <img
            src="/voomate-text-logo.png"
            alt="Voomate"
            className={cn('h-6 w-auto dark:invert', isCollapsed && 'hidden')}
          />
        </Link>
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="rounded-md bg-accent-100 dark:bg-accent-950 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-accent-800 dark:text-accent-300">
              Super Admin
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Internal OS
            </span>
          </div>
        )}
      </div>

      {/* Main Nav Groups */}
      <nav
        className="flex flex-1 flex-col gap-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label="Super Admin Navigation"
      >
        <NavigationGroup
          label="Governance"
          items={governanceItems}
          pathname={pathname}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />
        <NavigationGroup
          label="Real-Time Edge"
          items={voiceEdgeItems}
          pathname={pathname}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />
        <NavigationGroup
          label="Infrastructure"
          items={infraItems}
          pathname={pathname}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* Switch to Merchant Storefront Hub Link */}
      <div className="mt-auto space-y-2 pt-4 border-t border-[var(--border-default)]">
        <Link
          href="/"
          onClick={onNavigate}
          title={isCollapsed ? 'Merchant App' : undefined}
          className={cn(
            'flex min-h-10 items-center justify-between rounded-lg px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.045]',
            isCollapsed && 'justify-center px-0',
          )}
        >
          <span className={cn(isCollapsed && 'hidden')}>Switch to Merchant Dashboard</span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </aside>
  );
}
