'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const icon = (path: string) => (
  <svg viewBox="0 0 20 20" fill="none" className="size-[18px] shrink-0" aria-hidden="true">
    <path
      d={path}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ITEMS: NavItem[] = [
  {
    href: '/agents',
    label: 'Agents',
    icon: icon('M10 2.5v6M7 5.5a3 3 0 1 0 6 0M4.5 17.5v-2a5.5 5.5 0 0 1 11 0v2'),
  },
  {
    href: '/conversations',
    label: 'Conversations',
    icon: icon(
      'M3 6.5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5v5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3v-3H5.5',
    ),
  },
  { href: '/usage', label: 'Usage', icon: icon('M4 16V9M8 16V5M12 16v-4M16 16v-8') },
  {
    href: '/settings',
    label: 'Settings',
    icon: icon(
      'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4',
    ),
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5" aria-label="Main">
      {ITEMS.map((item) => {
        // Prefix match so /agents/abc/knowledge keeps "Agents" lit. Exact match would leave
        // the sidebar with nothing selected on every detail page.
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium',
              'transition-colors duration-100',
              active
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Agent-scoped tabs. Separate from the sidebar because they navigate within one agent —
 * mixing the two levels in one list is the fastest way to make a dashboard feel confusing.
 */
export function AgentTabs({ agentId }: { agentId: string }) {
  const pathname = usePathname();
  const base = `/agents/${agentId}`;

  const tabs = [
    { href: base, label: 'Overview' },
    { href: `${base}/knowledge`, label: 'Knowledge' },
    // Sits next to Knowledge on purpose: adding content and testing whether it worked is one
    // loop, and a merchant runs it a dozen times before publishing.
    { href: `${base}/playground`, label: 'Playground' },
    { href: `${base}/voice`, label: 'Voice & Languages' },
    { href: `${base}/behaviour`, label: 'Behaviour' },
    { href: `${base}/install`, label: 'Install' },
  ];

  return (
    <div className="border-b border-[var(--border-default)]">
      <nav className="-mb-px flex gap-1 overflow-x-auto px-6" aria-label="Agent sections">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'border-b-2 px-3 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-accent-600 text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
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
