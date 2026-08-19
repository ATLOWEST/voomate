import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SuperAdminShell } from '@/components/admin/super-admin-shell';

export const metadata: Metadata = {
  title: 'Super Admin | Voomate Platform OS',
  description: 'Internal governance, live voice edge playground, and merchant management.',
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
