import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from './form';
import { getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const user = await getUser();
  if (user) {
    // Workspace setup is handled from the dashboard. In particular, do not strand a signed-in
    // user on the legacy `?setup=workspace` page when a route or API lookup is slow.
    redirect('/overview');
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
