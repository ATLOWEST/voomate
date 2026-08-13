'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, MessageSquareText, Mic, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useApiAuth } from '@/lib/session';

type Conversation = {
  id: string;
  channel: 'text' | 'voice' | 'phone';
  status: 'active' | 'ended' | 'abandoned' | 'escalated';
  pageUrl: string | null;
  messageCount: number;
  startedAt: string;
};

type TranscriptMessage = {
  id: string;
  role: 'visitor' | 'agent' | 'system' | 'tool';
  content: string;
  createdAt: string;
};

export default function GlobalConversationsPage() {
  const auth = useApiAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const credentials = await auth();
      const result = await api.get<{ conversations: Conversation[] }>('/v1/conversations', {
        ...credentials,
      });
      setConversations(result.conversations);
      setSelectedId((current) =>
        current && result.conversations.some((item) => item.id === current)
          ? current
          : result.conversations[0]?.id,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Conversations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const credentials = await auth();
        const result = await api.get<{ messages: TranscriptMessage[] }>(
          `/v1/conversations/${selectedId}`,
          { ...credentials },
        );
        if (active) setMessages(result.messages);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Transcript could not be loaded.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [auth, selectedId]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
            Shared customer history
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Conversations
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Chat and website voice use this same transcript. Escalated conversations stay visible
            here for human review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadConversations()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-ink-100"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : conversations.length === 0 && !loading ? (
        <section className="mt-8 grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-border bg-card px-6 text-center shadow-subtle">
          <div>
            <MessageSquareText className="mx-auto size-7 text-accent-600" />
            <h2 className="mt-4 text-lg font-semibold">No conversations yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the installed widget and send a text or voice message.
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-8 grid min-h-[620px] overflow-hidden rounded-2xl border border-border bg-card shadow-subtle lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-border lg:border-r lg:border-b-0">
            <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recent · {conversations.length}
            </div>
            <div className="max-h-[620px] overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full border-b border-border px-4 py-4 text-left transition-colors ${
                    selectedId === conversation.id
                      ? 'bg-accent-50 dark:bg-accent-950/30'
                      : 'hover:bg-ink-50 dark:hover:bg-ink-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {conversation.channel === 'voice' ? (
                        <Mic className="size-4 text-accent-600" />
                      ) : (
                        <MessageSquareText className="size-4 text-accent-600" />
                      )}
                      {conversation.channel === 'voice' ? 'Website voice' : 'Web chat'}
                    </span>
                    {conversation.status === 'escalated' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        <AlertTriangle className="size-3" /> Human review
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {conversation.pageUrl ?? 'Embedded widget'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(conversation.startedAt).toLocaleString()} ·{' '}
                    {conversation.messageCount} messages
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            <div className="border-b border-border px-5 py-3 text-sm font-medium">Transcript</div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'visitor'
                      ? 'ml-auto bg-foreground text-background'
                      : message.role === 'agent'
                        ? 'border border-border bg-background text-foreground'
                        : 'bg-ink-100 text-muted-foreground dark:bg-ink-900'
                  }`}
                >
                  <p>{message.content}</p>
                  <time className="mt-2 block text-[11px] opacity-60">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </time>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
