import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from './form';
import { WorkspaceRecoveryForm } from './workspace-recovery-form';
import { getAccessToken, getUser } from '@/lib/supabase/server';
import { getOrganizations } from '@/lib/organizations';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const user = await getUser();
  if (user) {
    const accessToken = await getAccessToken();
    if (!accessToken) redirect('/sign-in');

    try {
      const organizations = await getOrganizations(accessToken);
      if (organizations.length > 0) redirect('/overview');
    } catch {
      // The recovery form will surface a clear, retryable error if the control plane is down.
    }

    return (
      <AuthShell mode="workspace">
        <WorkspaceRecoveryForm />
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="sign-up">
      <SignUpForm />
      <p className="auth-switch-copy">
        Already have an account?{' '}
        <Link href="/sign-in" className="auth-inline-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
