import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SuperAdminShell } from '@/components/admin/super-admin-shell';
import { createClient, getUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Super Admin | Voomate Platform OS',
  description: 'Internal governance, live voice edge playground, and merchant management.',
};

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const supabase = await createClient();
  const { data: administrator } = await supabase
    .from('platform_administrators')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  // This is a server-side, database-backed allowlist. Organization ownership is intentionally
  // irrelevant here: a merchant owner must never receive platform-wide visibility.
  if (!administrator) redirect('/agents');

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
