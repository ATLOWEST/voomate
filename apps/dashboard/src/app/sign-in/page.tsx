import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from './form';
import { getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const user = await getUser();
  if (user) redirect('/overview');

  return (
    <AuthShell mode="sign-in">
      <Suspense fallback={<p className="auth-loading">Preparing secure sign in...</p>}>
        <SignInForm />
      </Suspense>
      <p className="auth-switch-copy">
        New to Voomate?{' '}
        <Link href="/sign-up" className="auth-inline-link">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
