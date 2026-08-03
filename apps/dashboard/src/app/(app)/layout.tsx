import type { ReactNode } from 'react';
import { SidebarNav } from '@/components/shell/nav';
import { ThemeToggle } from '@/components/shell/theme-toggle';

/**
 * The authenticated shell.
 *
 * TODO(phase-1): this layout is where the Supabase session check goes. Unauthenticated
 * requests redirect to /sign-in *here*, in a server component, not in a client effect —
 * a client-side guard renders the dashboard shell before it redirects, which briefly leaks
 * the org name and navigation to someone who is not signed in.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-60 shrink-0 flex-col border-r border-[var(--border-default)] lg:flex"
        style={{ backgroundColor: 'var(--surface-panel)' }}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="bg-accent-600 flex size-7 items-center justify-center rounded-lg">
            <svg viewBox="0 0 20 20" fill="none" className="size-4 text-white" aria-hidden="true">
              <path
                d="M10 3.5v13M6 6.5v7M14 6.5v7M2.5 9v2M17.5 9v2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Soniq</span>
        </div>

        <div className="px-3 pb-2">
          <OrganizationSwitcher />
        </div>

        <div className="flex-1 px-3 py-2">
          <SidebarNav />
        </div>

        <div className="border-t border-[var(--border-default)] p-3">
          <a
            href="https://docs.soniq.example"
            className="block rounded-lg px-2.5 py-2 text-[13px] text-secondary transition-colors hover:bg-[var(--surface-hover)]"
          >
            Documentation ↗
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-1 border-b border-[var(--border-default)] px-4 lg:px-6">
          <ThemeToggle />
          <div
            className="ml-1 flex size-8 items-center justify-center rounded-full text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--surface-sunken)' }}
            aria-hidden="true"
          >
            {/* TODO(phase-1): initials from the signed-in user. */}—
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/**
 * Always visible, never a dropdown buried in a menu.
 *
 * Every write in this dashboard is scoped to whichever organization is selected here — the
 * value becomes the `x-organization-id` header. An agency managing five clients must be able
 * to see which one they're editing without clicking anything.
 */
function OrganizationSwitcher() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
      style={{ backgroundColor: 'var(--surface-sunken)' }}
    >
      <div className="bg-accent-100 text-accent-700 flex size-6 items-center justify-center rounded-md text-[11px] font-bold">
        —
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">No organization</div>
      </div>
      <svg viewBox="0 0 20 20" fill="none" className="size-4 text-[var(--text-muted)]">
        <path
          d="m7 8 3-3 3 3M7 12l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
