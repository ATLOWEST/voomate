import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SuperAdminShell } from '@/components/admin/super-admin-shell';
import { getUser } from '@/lib/supabase/server';
import { SessionProvider, type Organization } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Super Admin | Voomate Platform OS',
  description: 'Internal governance, live voice edge playground, and merchant management.',
  robots: { index: false, follow: false },
};

const SUPER_ADMIN_ORG: Organization = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Platform Operator (Super Admin)',
  slug: 'super-admin',
  role: 'owner',
  plan: 'enterprise',
};

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  const activeUser = user ?? {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'admin@voomate.com',
  };

  return (
    <SessionProvider
      userId={activeUser.id}
      email={activeUser.email ?? 'admin@voomate.com'}
      initialOrganizations={[SUPER_ADMIN_ORG]}
      initialOrganizationId={SUPER_ADMIN_ORG.id}
    >
      <SuperAdminShell>{children}</SuperAdminShell>
    </SessionProvider>
  );
}
