'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the browser console useful for support without rendering an empty application.
    console.error('Dashboard route failed to render', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-5 py-10 sm:px-8">
      <section className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-soft)] p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-lg bg-caution-soft text-caution">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-foreground">
          This dashboard page could not load
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Your workspace and agent data are safe. Try again, or return to the main dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          <Link
            href="/overview"
            className="inline-flex min-h-10 items-center rounded-lg bg-[var(--surface-sunken)] px-4 text-sm font-semibold text-foreground"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
