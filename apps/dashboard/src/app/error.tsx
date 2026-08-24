'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Catches failures in a route-group layout itself. The dashboard-level boundary cannot catch
 * its own layout, so without this the browser falls back to Next's empty generic error view.
 */
export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Application route failed to render', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-10 sm:px-8">
      <section className="w-full rounded-xl border border-neutral-200 bg-white p-6 text-neutral-950 shadow-sm sm:p-8">
        <span className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-700">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">The dashboard could not load</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Your account is still safe. Try again, or return to the sign-in screen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          <Link
            href="/sign-in"
            className="inline-flex min-h-10 items-center rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-950"
          >
            Sign in again
          </Link>
        </div>
      </section>
    </main>
  );
}
