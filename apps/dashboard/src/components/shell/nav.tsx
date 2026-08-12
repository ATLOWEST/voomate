'use client';

import type { ElementType, MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bot,
  Blocks,
  FileCheck2,
  Home,
  Inbox,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Waypoints,
  MessageSquareText,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  title: string;
  href?: string;
  icon: ElementType;
  shortcut?: string;
  onClick?: () => void;
};
type NavGroup = { label?: string; items: NavItem[] };

function navGroups(onSearchClick: () => void): NavGroup[] {
  return [
    {
      items: [
        { title: 'Overview', href: '/', icon: Home },
        { title: 'Search', icon: Search, shortcut: '⌘ K', onClick: onSearchClick },
      ],
    },
    {
      label: 'Build',
      items: [
        { title: 'Agents', href: '/agents', icon: Bot },
        { title: 'Connect', href: '/integrations', icon: Blocks },
      ],
    },
    {
      label: 'Operate',
      items: [
        { title: 'Conversations', href: '/conversations', icon: Inbox },
        { title: 'Logs', href: '/logs', icon: Radio },
        { title: 'Feedback', href: '/feedback', icon: MessageSquareText },
        { title: 'Approvals', href: '/approvals', icon: ShieldCheck },
        { title: 'Usage', href: '/usage', icon: Activity },
      ],
    },
  ];
}

function Item({ item, pathname }: { item: NavItem; pathname: string }) {
  const active =
    item.href !== undefined &&
    (pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)));
  const className = cn(
    'group flex min-h-10 items-center justify-between rounded-lg px-3 text-[13px] font-medium transition-colors',
    active
      ? 'bg-ink-100 text-foreground dark:bg-ink-800'
      : 'text-muted-foreground hover:bg-ink-100/80 hover:text-foreground dark:hover:bg-ink-800/70',
  );
  const content = (
    <>
      <span className="flex items-center gap-2.5">
        <item.icon
          className={cn(
            'size-4',
            active ? 'text-accent-600' : 'text-muted-foreground group-hover:text-foreground',
          )}
          strokeWidth={active ? 2 : 1.75}
        />
        {item.title}
      </span>
      {item.shortcut && (
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition group-hover:opacity-100">
          {item.shortcut}
        </kbd>
      )}
    </>
  );
  if (item.href)
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        item.onClick?.();
      }}
      className={cn(className, 'w-full')}
    >
      {content}
    </button>
  );
}

export function SidebarNav({
  className,
  onSearchClick,
}: {
  className?: string;
  onSearchClick: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside
      className={cn('dashboard-sidebar flex h-full flex-col border-r border-border bg-card px-3 py-4', className)}
    >
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2.5">
        <span className="ember-mark flex size-8 items-center justify-center rounded-lg text-white">
          <Waypoints className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.04em] text-foreground">
          Voomate
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {navGroups(onSearchClick).map((group) => (
          <div key={group.label ?? 'main'}>
            <p
              className={cn(
                'mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
                !group.label && 'sr-only',
              )}
            >
              {group.label ?? 'Main navigation'}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Item item={item} pathname={pathname} key={item.title} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 border-t border-border pt-3">
        <Link
          href="/settings"
          className="group flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition hover:bg-ink-100 hover:text-foreground dark:hover:bg-ink-800"
        >
          <Settings2 className="size-4" />
          Workspace settings
        </Link>
        <Link
          href="/agents"
          className="mt-2 flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2.5 text-xs font-medium text-accent-700 dark:bg-accent-950/50 dark:text-accent-200"
        >
          <Sparkles className="size-4" />
          Build your AI team
        </Link>
      </div>
    </aside>
  );
}

const workspaceTabs = [
  { href: '/', label: 'Overview' },
  { href: '/agents', label: 'Agents' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/logs', label: 'Logs' },
  { href: '/usage', label: 'Usage' },
];

export function WorkspaceTabs() {
  const pathname = usePathname();

  return (
    <div className="workspace-tabs" aria-label="Workspace sections">
      <nav>
        {workspaceTabs.map((tab) => {
          const active =
            pathname === tab.href || (tab.href !== '/' && pathname.startsWith(`${tab.href}/`));
          return (
            <Link
              href={tab.href}
              key={tab.href}
              aria-current={active ? 'page' : undefined}
              data-active={active}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AgentTabs({ agentId }: { agentId: string }) {
  const pathname = usePathname();
  const base = `/agents/${agentId}`;
  const tabs = [
    { href: base, label: 'Overview' },
    { href: `${base}/knowledge`, label: 'Knowledge' },
    { href: `${base}/configuration`, label: 'Configure' },
    { href: `${base}/playground`, label: 'Test' },
    { href: `${base}/conversations`, label: 'Conversations' },
    { href: `${base}/install`, label: 'Deploy' },
  ];
  return (
    <div className="border-b border-border">
      <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-5 sm:px-8 lg:px-10">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              href={tab.href}
              key={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-accent-600 text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-ink-300 hover:text-foreground dark:hover:border-ink-700',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
