import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from './form';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
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
