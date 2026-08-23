import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SuperAdminShell } from '@/components/admin/super-admin-shell';
import { getUser, isPlatformAdministrator } from '@/lib/supabase/server';
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
  if (!user) redirect('/sign-in?next=/admin');

  if (!(await isPlatformAdministrator(user.id))) {
    redirect('https://app.atlowest.in/');
  }

  return (
    <SessionProvider
      userId={user.id}
      email={user.email ?? ''}
      initialOrganizations={[SUPER_ADMIN_ORG]}
      initialOrganizationId={SUPER_ADMIN_ORG.id}
    >
      <SuperAdminShell>{children}</SuperAdminShell>
    </SessionProvider>
  );
}
