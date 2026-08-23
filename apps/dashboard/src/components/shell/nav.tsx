'use client';

import { useState, type ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  CircleGauge,
  Inbox,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';

type NavItem = {
  title: string;
  href: string;
  icon: ElementType;
};

const primaryItems: NavItem[] = [
  { title: 'Overview', href: '/overview', icon: CircleGauge },
  { title: 'Inbox', href: '/conversations', icon: Inbox },
];

const workspaceItems: NavItem[] = [
  { title: 'Agents', href: '/agents', icon: Bot },
  { title: 'Connections', href: '/integrations', icon: Boxes },
];

const secondaryItems: NavItem[] = [
  { title: 'Activity', href: '/logs', icon: Activity },
  { title: 'Approvals', href: '/approvals', icon: ShieldCheck },
  { title: 'Feedback', href: '/feedback', icon: MessageSquareText },
  { title: 'Usage', href: '/usage', icon: CircleGauge },
  { title: 'Settings', href: '/settings', icon: Settings2 },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
}

function WorkspaceSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
  const { organizations, organization, selectOrganization } = useSession();
  const [open, setOpen] = useState(false);
  const name = organization?.name ?? 'Choose a workspace';
  const plan = organization?.plan ? organization.plan + ' plan' : 'Workspace';

  return (
    <div className="relative mb-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'group flex min-h-[58px] w-full items-center gap-3 rounded-lg bg-white px-2.5 text-left shadow-[0_1px_0_rgba(20,20,18,0.04),0_8px_24px_rgba(20,20,18,0.04)] transition-[background-color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(20,20,18,0.04),0_12px_30px_rgba(20,20,18,0.07)] dark:bg-white/[0.06] dark:shadow-none',
          isCollapsed && 'justify-center px-0 gap-0 shadow-none bg-transparent',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-100 text-[13px] font-bold text-accent-800 dark:bg-accent-950/50 dark:text-accent-200">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className={cn('min-w-0 flex-1', isCollapsed && 'hidden')}>
          <span className="block truncate text-[13.5px] font-semibold text-foreground">{name}</span>
          <span className="mt-0.5 block text-[11px] capitalize text-muted-foreground">{plan}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            open && 'rotate-180',
            isCollapsed && 'hidden',
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close workspace menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-[66px] left-0 z-40 w-full rounded-lg bg-card p-2 shadow-overlay">
            <p className="px-2 pb-2 pt-1 text-[11px] font-medium text-muted-foreground">
              Your workspaces
            </p>
            <div className="space-y-1">
              {organizations.map((workspace) => {
                const selected = workspace.id === organization?.id;
                return (
                  <button
                    type="button"
                    key={workspace.id}
                    onClick={() => {
                      selectOrganization(workspace.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[12.5px] transition-colors',
                      selected
                        ? 'bg-accent-50 font-semibold text-foreground dark:bg-accent-950/35'
                        : 'text-muted-foreground hover:bg-[var(--surface-sunken)] hover:text-foreground',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                    {selected && <Check className="size-3.5 text-accent-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
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
        'dashboard-nav-link group relative flex min-h-11 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-[13.5px] font-medium transition-[background-color,color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:translate-y-px',
        active
          ? 'bg-white text-foreground shadow-[0_1px_0_rgba(20,20,18,0.035),0_7px_18px_rgba(20,20,18,0.04)] dark:bg-white/[0.075] dark:shadow-none'
          : 'text-muted-foreground hover:translate-x-0.5 hover:bg-white/75 hover:text-foreground dark:hover:bg-white/[0.05]',
        isCollapsed && 'justify-center px-0 hover:translate-x-0',
      )}
      title={isCollapsed ? item.title : undefined}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-md transition-[background-color,color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.06]',
          active
            ? 'bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-200'
            : 'text-muted-foreground group-hover:bg-[var(--surface-sunken)] group-hover:text-foreground',
        )}
      >
        <item.icon className="size-4 shrink-0" strokeWidth={2.2} />
      </span>
      <span className={cn('truncate', isCollapsed && 'hidden')}>{item.title}</span>
      {active && <span className="ml-auto size-1.5 rounded-full bg-accent-500" />}
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
        <p className="mb-1.5 px-2.5 text-[11px] font-medium text-muted-foreground">{label}</p>
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

export function SidebarNav({
  className,
  isCollapsed,
  onNavigate,
}: {
  className?: string;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const secondaryActive = secondaryItems.some((item) => isActivePath(pathname, item.href));

  return (
    <aside
      className={cn(
        'dashboard-sidebar flex h-full flex-col bg-[var(--surface-navigation)] px-3 py-4',
        className,
      )}
    >
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          'mb-5 flex items-center gap-2.5 py-1',
          isCollapsed ? 'justify-center' : 'justify-start px-2',
        )}
      >
        <img src="/voomate-logo.png" alt="Voomate" className="h-8 w-auto dark:invert" />
        <img
          src="/voomate-text-logo.png"
          alt="Voomate"
          className={cn('h-6 w-auto dark:invert', isCollapsed && 'hidden')}
        />
      </Link>

      <WorkspaceSwitcher isCollapsed={isCollapsed} />

      <nav
        className="flex flex-1 flex-col gap-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label="Main navigation"
      >
        <NavigationGroup
          items={primaryItems}
          pathname={pathname}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />
        <NavigationGroup
          label="Your business"
          items={workspaceItems}
          pathname={pathname}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        <details className="group/more" open={secondaryActive || undefined}>
          <summary
            className={cn(
              'flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-white/75 hover:text-foreground dark:hover:bg-white/[0.05] [&::-webkit-details-marker]:hidden',
              isCollapsed && 'justify-center px-0',
            )}
          >
            <span className={cn(isCollapsed && 'hidden')}>More</span>
            {isCollapsed && <MoreHorizontal className="size-4" />}
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open/more:rotate-180',
                isCollapsed && 'hidden',
              )}
            />
          </summary>
          <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open/more:grid-rows-[1fr] group-open/more:opacity-100">
            <div className="min-h-0 overflow-hidden">
              <div className="mt-1 space-y-1">
                {secondaryItems.map((item) => (
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
          </div>
        </details>
      </nav>

      <Link
        href="/agents"
        onClick={onNavigate}
        title={isCollapsed ? 'Add an agent' : undefined}
        className={cn(
          'group mt-5 flex min-h-11 items-center justify-between rounded-lg bg-foreground px-3.5 text-[13px] font-semibold text-background transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:opacity-92 active:translate-y-px',
          isCollapsed && 'justify-center px-0',
        )}
      >
        <span className={cn(isCollapsed && 'hidden')}>Add an agent</span>
        <span
          className={cn(
            'grid size-6 place-items-center rounded-md bg-background/15 transition-transform duration-500',
            !isCollapsed && 'group-hover:rotate-90',
          )}
        >
          <Plus className="size-3.5" />
        </span>
      </Link>
    </aside>
  );
}
