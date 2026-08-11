import { BarChart3, CreditCard, MessageSquare, Phone, ShieldCheck } from 'lucide-react';

const categories = [
  { title: 'Web conversations', description: 'Chat and action requests', icon: MessageSquare },
  { title: 'Voice minutes', description: 'Website voice and calls', icon: Phone },
  { title: 'AI usage', description: 'Knowledge retrieval and answers', icon: BarChart3 },
];

export default function UsagePage() {
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
            Understand what your AI operation uses, without surprise charges.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          <CreditCard className="size-3.5" />
          No active plan
        </span>
      </header>
      <section className="mt-8 rounded-2xl border border-border bg-card shadow-subtle">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold text-foreground">Current cycle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage will begin after you publish an agent.
          </p>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <article className="bg-card p-6" key={category.title}>
                <Icon className="size-5 text-muted-foreground" />
                <p className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-foreground">—</p>
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
            <h2 className="text-sm font-semibold text-foreground">You stay in control of cost</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Before agents go live, you’ll be able to set usage limits and receive warnings before
              your plan’s allowance is reached.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
