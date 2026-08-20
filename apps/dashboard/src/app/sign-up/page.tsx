import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { SignUpForm } from './form';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignUpPage() {
  if (await getUser()) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <img src="/voomate-logo.png" alt="Voomate" className="h-10 w-auto dark:invert" />
        </div>
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Create your workspace</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
          Start with one secure Voomate account and a workspace for your business.
        </p>
        <SignUpForm />
        <p className="mt-5 text-center text-[13px] text-secondary">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
