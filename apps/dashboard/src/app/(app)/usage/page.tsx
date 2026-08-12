'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CreditCard, ImageIcon, MessageSquare, Phone, ShieldCheck } from 'lucide-react';
import { useSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';

type UsageRow = { kind: string; quantity: number };

const number = new Intl.NumberFormat();

export default function UsagePage() {
  const { organization } = useSession();
  const [rows, setRows] = useState<UsageRow[]>([]);

  useEffect(() => {
    if (!organization) return;
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    void createClient()
      .from('usage_records')
      .select('kind,quantity')
      .eq('organization_id', organization.id)
      .gte('period_hour', start.toISOString())
      .then(({ data }) => setRows((data ?? []) as UsageRow[]));
  }, [organization]);

  const totals = useMemo(() => {
    const values: Record<string, number> = {};
    for (const row of rows) values[row.kind] = (values[row.kind] ?? 0) + Number(row.quantity);
    return values;
  }, [rows]);

  const categories = [
    {
      title: 'Web conversations',
      description: 'Chat and action requests',
      value: number.format(totals.text_messages ?? 0),
      icon: MessageSquare,
    },
    {
      title: 'Voice minutes',
      description: 'Website voice and calls',
      value: number.format(totals.voice_minutes ?? 0),
      icon: Phone,
    },
    {
      title: 'AI tokens',
      description: 'All model input and output tokens',
      value: number.format((totals.llm_input_tokens ?? 0) + (totals.llm_output_tokens ?? 0)),
      icon: BarChart3,
    },
    {
      title: 'Vision request input',
      description: `${((totals.image_upload_bytes ?? 0) / 1_048_576).toFixed(2)} MB uploaded`,
      value: `${number.format(totals.image_input_tokens ?? 0)} tokens`,
      icon: ImageIcon,
    },
    {
      title: 'Knowledge embeddings',
      description: 'Tokens embedded from crawls, files, and Connect syncs',
      value: `${number.format(totals.embedding_input_tokens ?? 0)} tokens`,
      icon: BarChart3,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Usage and billing
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Tenant-scoped model, image, message, and voice usage for the current UTC month.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          <CreditCard className="size-3.5" /> Usage metering active
        </span>
      </header>
      <section className="mt-8 rounded-2xl border border-border bg-card shadow-subtle">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Current cycle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Input tokens for image-bearing requests are tracked separately so multimodal spend is
            easy to identify.
          </p>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <article className="bg-card p-6" key={category.title}>
                <Icon className="size-5 text-muted-foreground" />
                <p className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {category.value}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-foreground">{category.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {category.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-subtle">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-positive-soft text-positive">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Image cost controls are active
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Two images per message, 5 MB each, 1568 px processing, per-session rate limits, and
              48-hour deletion prevent unbounded storage and inference usage.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
