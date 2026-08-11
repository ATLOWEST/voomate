import { Blocks, Database, FileText, Globe2, PlugZap, ShieldCheck, Webhook } from 'lucide-react';

const connectionTypes = [
  {
    title: 'Website and knowledge',
    description: 'Use your website, documents and FAQs as the agent’s source of truth.',
    icon: Globe2,
    state: 'Available from each agent',
  },
  {
    title: 'Business apps',
    description: 'Connect your CRM, calendar, commerce and support systems for live information.',
    icon: Blocks,
    state: 'Connector catalogue coming next',
  },
  {
    title: 'Custom actions',
    description: 'Give your agent carefully controlled actions through your own API.',
    icon: Webhook,
    state: 'For technical teams',
  },
];

export default function IntegrationsPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
          Connect
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Give your agents useful context.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Connect the knowledge and systems your business already uses. Every connection is scoped
          to your workspace and controlled by permissions.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-card shadow-subtle">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Your connections</h2>
            <p className="mt-1 text-sm text-muted-foreground">No systems are connected yet.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            <ShieldCheck className="size-3.5" />
            Permissions first
          </span>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          {connectionTypes.map((item) => {
            const Icon = item.icon;
            return (
              <article className="bg-card p-6" key={item.title}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                <p className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600">
                  <PlugZap className="size-3.5" />
                  {item.state}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
          <FileText className="size-5 text-accent-600" />
          <h2 className="mt-4 text-base font-semibold text-foreground">Start with knowledge</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The fastest way to make an agent useful is to give it the information your customers ask
            about. Add a website or document while creating an agent.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
          <Database className="size-5 text-accent-600" />
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Actions stay under your control
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            When live connectors arrive, you will choose exactly what an agent can read, change or
            send—and which actions need your approval.
          </p>
        </article>
      </section>
    </main>
  );
}
