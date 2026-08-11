import Link from 'next/link';
import { ArrowRight, MessageSquareText, Radio, Sparkles } from 'lucide-react';

export default function GlobalConversationsPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
          Operate
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Conversations
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Every chat and voice interaction will appear here, with the actions your agent took and
          the knowledge it used.
        </p>
      </header>
      <section className="mt-8 grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-border bg-card px-6 text-center shadow-subtle">
        <div className="max-w-md">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-950/50">
            <MessageSquareText className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-[-0.025em] text-foreground">
            No conversations yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Once an agent is live, this becomes your shared inbox for web chat, website voice and
            calling conversations.
          </p>
          <Link
            href="/agents"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-600 hover:text-accent-700"
          >
            Set up an agent <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5 shadow-subtle">
          <Radio className="size-4 text-accent-600" />
          <h2 className="mt-3 text-sm font-semibold text-foreground">
            One shared customer history
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            A visitor can begin on chat and continue on voice without starting over.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5 shadow-subtle">
          <Sparkles className="size-4 text-accent-600" />
          <h2 className="mt-3 text-sm font-semibold text-foreground">
            Improve from real questions
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Unanswered questions will show you exactly what knowledge to add next.
          </p>
        </article>
      </section>
    </main>
  );
}
