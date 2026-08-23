import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from './form';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
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
