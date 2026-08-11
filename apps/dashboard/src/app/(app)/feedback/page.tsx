'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Lightbulb, MessageSquareText, Send } from 'lucide-react';

export default function FeedbackPage() {
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = String(form.get('subject') ?? 'Voomate feedback');
    const message = String(form.get('message') ?? '');
    window.location.href = `mailto:feedback@voomate.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    setSent(true);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="dashboard-card overflow-hidden rounded-3xl">
        <div className="ember-wash border-b border-accent-100 px-6 py-8 sm:px-9">
          <span className="ember-mark flex size-11 items-center justify-center rounded-2xl text-white">
            <MessageSquareText className="size-5" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Help us improve Voomate
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Tell us what would make your AI operation easier to run. Your message opens in your
            email app so you keep a copy too.
          </p>
        </div>

        <form className="space-y-6 px-6 py-8 sm:px-9" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-semibold text-foreground">What is this about?</span>
            <input
              name="subject"
              required
              placeholder="For example: I need another integration"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent-400 focus:ring-4 focus:ring-accent-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Your feedback</span>
            <textarea
              name="message"
              required
              rows={7}
              placeholder="Describe the problem, your idea, or what you expected to happen."
              className="mt-2 w-full resize-y rounded-xl border border-border bg-white px-3 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent-400 focus:ring-4 focus:ring-accent-100"
            />
          </label>
          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
              <Lightbulb className="size-4 shrink-0 text-accent-600" />
              Product ideas, bugs, and requested integrations are all welcome.
            </p>
            <button
              className="ember-button inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
              type="submit"
            >
              <Send className="size-4" />
              Send feedback
            </button>
          </div>
          {sent && (
            <p className="flex items-center gap-2 text-sm font-medium text-positive">
              <CheckCircle2 className="size-4" /> Your email app has been opened with the feedback
              ready to send.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
