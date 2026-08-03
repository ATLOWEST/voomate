import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { SidebarNav } from '@/components/shell/nav';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { AccountMenu, OrganizationSwitcher } from '@/components/shell/account';
import { api } from '@/lib/api';
import { ORG_COOKIE, SessionProvider, type Organization } from '@/lib/session';
import { getAccessToken, getUser } from '@/lib/supabase/server';

/**
 * The authenticated shell.
 *
 * The session check is here, in a server component, and it redirects *before* rendering
 * anything. A client-side guard paints the sidebar, the organization name and the navigation
 * first and redirects afterwards, which shows the shape of a customer's account to someone who
 * is not signed in.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const accessToken = await getAccessToken();

  // Fetched server-side so the org switcher is correct on first paint. A switcher that says
  // "No organization" for a moment and then fills in makes every page load look broken.
  let organizations: Organization[] = [];
  try {
    const result = await api.get<{ organizations: Organization[] }>('/v1/organizations', {
      accessToken,
    });
    organizations = result.organizations;
  } catch {
    // The API being down must not lock the user out of a page that could still tell them so.
    // The empty state below is more useful than an error boundary swallowing the whole shell.
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  const selected = organizations.some((o) => o.id === preferred) ? preferred : organizations[0]?.id;

  return (
    <SessionProvider
      userId={user.id}
      email={user.email ?? ''}
      initialOrganizations={organizations}
      initialOrganizationId={selected}
    >
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
            <AccountMenu />
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
