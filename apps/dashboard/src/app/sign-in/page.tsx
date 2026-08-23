import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { SignInForm } from './form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage() {
  // Someone already signed in who lands here (a bookmark, a back button) should go straight
  // to work rather than being shown a form that will bounce them anyway.
  if (await getUser()) redirect('/agents');

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <img src="/voomate-logo.png" alt="Voomate" className="h-10 w-auto dark:invert" />
        </div>

        <h1 className="text-xl font-semibold tracking-[-0.02em]">Sign in</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
          Use the email and password for your Voomate account.
        </p>

        <Suspense fallback={<div className="mt-7 h-48 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />}>
          <SignInForm />
        </Suspense>
        <p className="mt-5 text-center text-[13px] text-secondary">
          New to Voomate?{' '}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
