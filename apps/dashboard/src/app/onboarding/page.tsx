import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/lib/supabase/server';
import { WorkspaceOnboardingForm } from './form';

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
        <p className="text-sm font-semibold text-primary">Voomate</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-primary">
          Set up your workspace
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Give your business workspace a name. You can invite teammates after setup.
        </p>
        <Suspense fallback={<p className="mt-7 text-sm text-secondary">Preparing workspace setup…</p>}>
          <WorkspaceOnboardingForm />
        </Suspense>
      </section>
    </main>
  );
}
