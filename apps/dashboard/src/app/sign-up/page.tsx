import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from './form';
import { getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const user = await getUser();
  if (user) redirect('/');

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
