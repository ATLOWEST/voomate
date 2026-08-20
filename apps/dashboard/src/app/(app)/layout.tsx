import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { ORG_COOKIE, SessionProvider, type Organization } from '@/lib/session';
import { getAccessToken, getUser } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/app-shell';

import { ConversationDrawer } from '@/components/ui/premium/conversation-drawer';
import { Suspense } from 'react';

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

  let organizations: Organization[] = [];
  try {
    const result = await api.get<{ organizations: Organization[] }>('/v1/organizations', {
      accessToken,
    });
    organizations = result.organizations;
  } catch {}

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
      <AppShell>
        {children}
        <Suspense fallback={null}>
          <ConversationDrawer />
        </Suspense>
      </AppShell>
    </SessionProvider>
  );
}
