import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ORG_COOKIE, SessionProvider, type Organization } from '@/lib/session';
import { cookies } from 'next/headers';
import { getAccessToken, getMiddlewareIdentity, getUser } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/app-shell';
import { getOrganizations } from '@/lib/organizations';

import { ConversationDrawer } from '@/components/ui/premium/conversation-drawer';
import { Suspense } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const identity = await getMiddlewareIdentity();
  const user = identity ?? (await getUser());
  if (user === undefined || user === null) redirect('/sign-in');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect('/sign-in');

  let organizations: Organization[] = [];
  let organizationLookupFailed = false;
  try {
    organizations = await getOrganizations(accessToken);
  } catch {
    // Do not turn a temporary control-plane failure into a false "create a workspace" journey.
    // The app shell will keep the user in their current portal with no tenant selected until the
    // API becomes reachable again.
    organizationLookupFailed = true;
  }

  // One route owns workspace setup. The legacy /onboarding URL is retained only as a redirect
  // for old bookmarks; new signup already creates the workspace before sign-in.
  if (organizations.length === 0 && !organizationLookupFailed) {
    redirect('/sign-up?setup=workspace');
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
      <AppShell>
        {children}
        <Suspense fallback={null}>
          <ConversationDrawer />
        </Suspense>
      </AppShell>
    </SessionProvider>
  );
}
