import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { ORG_COOKIE, SessionProvider, type Organization } from '@/lib/session';
import { getAccessToken, getUser } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/app-shell';

import { ConversationDrawer } from '@/components/ui/premium/conversation-drawer';
import { Suspense } from 'react';

const DEFAULT_ORG: Organization = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Voomate Store Demo',
  slug: 'voomate-demo',
  role: 'owner',
  plan: 'growth',
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  const activeUser = user ?? {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@voomate.com',
  };

  const accessToken = await getAccessToken();

  let organizations: Organization[] = [];
  try {
    if (accessToken) {
      const result = await api.get<{ organizations: Organization[] }>('/v1/organizations', {
        accessToken,
      });
      organizations = result.organizations;
    }
  } catch {
    // Fall back to default demo organization if API is unreachable
  }

  if (organizations.length === 0) {
    organizations = [DEFAULT_ORG];
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  const selected = organizations.some((o) => o.id === preferred) ? preferred : organizations[0]?.id;

  return (
    <SessionProvider
      userId={activeUser.id}
      email={activeUser.email ?? 'demo@voomate.com'}
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
