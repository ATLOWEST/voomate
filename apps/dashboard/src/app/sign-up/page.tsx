import Link from 'next/link';
import { SignUpForm } from './form';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-primary">
          Voomate
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-primary">Create account</h1>
        <p className="mt-2 text-sm text-secondary">
          Create your workspace, then verify your email before using the Dashboard.
        </p>
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-secondary">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
