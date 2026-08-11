import type { Metadata } from 'next';
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
        <div className="mb-8 flex items-center gap-2.5">
          <div className="bg-accent-600 flex size-8 items-center justify-center rounded-lg">
            <svg viewBox="0 0 20 20" fill="none" className="size-4.5 text-white" aria-hidden="true">
              <path
                d="M10 3.5v13M6 6.5v7M14 6.5v7M2.5 9v2M17.5 9v2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-[-0.02em]">Voomate</span>
        </div>

        <h1 className="text-xl font-semibold tracking-[-0.02em]">Sign in</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">
          Use the email and password for your Voomate account.
        </p>

        <SignInForm />
      </div>
    </main>
  );
}
