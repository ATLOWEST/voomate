import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { ORG_COOKIE, SessionProvider, type Organization } from '@/lib/session';
import { cookies } from 'next/headers';
import { getAccessToken, getUser } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/app-shell';

import { ConversationDrawer } from '@/components/ui/premium/conversation-drawer';
import { Suspense } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect('/sign-in');

  let organizations: Organization[] = [];
  try {
    if (accessToken) {
      const result = await api.get<{ organizations: Organization[] }>('/v1/organizations', {
        accessToken,
      });
      organizations = result.organizations;
    }
  } catch {
    // A control-plane failure must never select or render another tenant.
  }

  if (organizations.length === 0) redirect('/onboarding');

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
