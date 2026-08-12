'use client';

import { useCallback, useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { useSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';

type RunEvent = {
  id: string;
  run_id: string;
  stage: string;
  status: string;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function LogsPage() {
  const { organization } = useSession();
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    setError(undefined);
    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from('agent_run_events')
      .select('id,run_id,stage,status,latency_ms,metadata,created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(250);
    if (queryError) setError(queryError.message);
    else setEvents((data ?? []) as RunEvent[]);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent-600">
            <Radio className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">Live trace</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Knowledge syncs, tenant resolution, model calls, tool safety checks, and responses for
            this workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-ink-100"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : events.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-medium">No Web Agent runs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open an installed widget and send a message. Each step will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[180px_1fr_110px_90px] gap-4 border-b border-border bg-ink-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-ink-900">
            <span>Time</span>
            <span>Stage</span>
            <span>Status</span>
            <span>Latency</span>
          </div>
          <div className="divide-y divide-border">
            {events.map((event) => (
              <details key={event.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[180px_1fr_110px_90px] gap-4 px-4 py-3 text-sm hover:bg-ink-50 dark:hover:bg-ink-900">
                  <time className="text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                  <span className="font-mono text-xs">{event.stage}</span>
                  <span
                    className={
                      event.status === 'success'
                        ? 'text-emerald-600'
                        : event.status === 'started'
                          ? 'text-blue-600'
                          : 'text-red-600'
                    }
                  >
                    {event.status}
                  </span>
                  <span className="text-muted-foreground">
                    {event.latency_ms == null ? '—' : `${event.latency_ms} ms`}
                  </span>
                </summary>
                <pre className="overflow-x-auto bg-ink-950 px-4 py-3 text-xs text-ink-100">
                  {JSON.stringify({ runId: event.run_id, ...event.metadata }, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
