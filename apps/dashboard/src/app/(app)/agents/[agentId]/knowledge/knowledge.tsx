'use client';

/**
 * Knowledge.
 *
 * Three source types, in the order merchants use them: crawl the site, then patch the gaps
 * with Q&A pairs, then paste anything that lives nowhere on the web.
 *
 * Q&A pairs and pasted text are indexed the moment they are saved, so the list polls while
 * anything is still working. A merchant who adds a Q&A pair and sees "pending" forever, with
 * no idea whether to wait or refresh, will assume the product is broken.
 */
import { useState } from 'react';
import type { KnowledgeSource } from '@voomate/core';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { api } from '@/lib/api';
import { useApiAction, useApiQuery } from '@/lib/hooks';

type DialogKind = 'website' | 'qa' | 'text';

/** Statuses that are still moving. Anything here means the list is worth re-reading. */
const IN_FLIGHT = new Set(['pending', 'crawling', 'processing', 'indexing']);

export function KnowledgePanels() {
  const { agent } = useAgent();
  const [dialog, setDialog] = useState<DialogKind>();

  const { data, error, loading, refetch } = useApiQuery<{ sources: KnowledgeSource[] }>(
    `/v1/agents/${agent.id}/knowledge`,
  );

  const sources = data?.sources ?? [];
  const working = sources.some((source) => IN_FLIGHT.has(source.status));

  // Poll only while something is actually running. A dashboard left open on a finished agent
  // should cost nothing.
  const polled = useApiQuery<{ sources: KnowledgeSource[] }>(
    working ? `/v1/agents/${agent.id}/knowledge` : null,
    { pollMs: 3000 },
  );
  const current = polled.data?.sources ?? sources;

  const byType = (type: string) => current.filter((source) => source.type === type);

  return (
    <PageBody>
      {error !== undefined && (
        <Callout
          tone="critical"
          title="Could not load knowledge sources"
          action={
            <Button size="sm" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {error}
        </Callout>
      )}

      <Panel>
        <PanelHeader
          title="Website"
          description="We crawl your site, respect robots.txt, and re-crawl on a schedule so answers follow your content."
          action={
            <Button variant="primary" size="sm" onClick={() => setDialog('website')}>
              Add website
            </Button>
          }
        />
        <PanelBody className="p-0">
          <SourceList
            sources={byType('website')}
            loading={loading}
            agentId={agent.id}
            onChanged={refetch}
            empty={
              <EmptyState
                title="No website added"
                description="Add your website address to start. Crawling a typical marketing site takes a few minutes; you can keep working while it runs."
              />
            }
          />
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Q&A pairs"
          description="Exact answers for questions you care about getting exactly right — pricing, refunds, delivery times. These are indexed immediately."
          action={
            <Button size="sm" onClick={() => setDialog('qa')}>
              Add pair
            </Button>
          }
        />
        <PanelBody className="p-0">
          <SourceList
            sources={byType('qa_pair')}
            loading={loading}
            agentId={agent.id}
            onChanged={refetch}
            empty={<Blank>No Q&amp;A pairs yet.</Blank>}
          />
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Developer sync"
          description="Content pushed from your backend with @voomate/connect. Stable IDs update in place and unchanged content is not embedded again."
        />
        <PanelBody className="p-0">
          <SourceList
            sources={byType('api_sync')}
            loading={loading}
            agentId={agent.id}
            onChanged={refetch}
            empty={<Blank>No developer-synced content yet.</Blank>}
          />
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Additional context"
          description="Anything that isn't on your website. Once saved, retrieval treats it the same as crawled content."
          action={
            <Button size="sm" onClick={() => setDialog('text')}>
              Add text
            </Button>
          }
        />
        <PanelBody className="p-0">
          <SourceList
            sources={byType('manual_text')}
            loading={loading}
            agentId={agent.id}
            onChanged={refetch}
            empty={<Blank>Nothing added yet.</Blank>}
          />
        </PanelBody>
      </Panel>

      {dialog !== undefined && (
        <AddSourceDialog
          kind={dialog}
          agentId={agent.id}
          onClose={() => setDialog(undefined)}
          onAdded={() => {
            setDialog(undefined);
            refetch();
          }}
        />
      )}
    </PageBody>
  );
}

function Blank({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-6 text-center text-[13px] text-muted">{children}</p>;
}

const STATUS_TONE: Record<string, 'neutral' | 'positive' | 'caution' | 'critical'> = {
  ready: 'positive',
  failed: 'critical',
  excluded: 'neutral',
};

/**
 * What each status means in the merchant's own terms.
 *
 * A crawl of a large site is minutes long, and "working" for four minutes is indistinguishable
 * from a hang. Naming the actual phase — reading the site, then learning it — turns dead time
 * into visible progress, which is the difference between waiting and giving up.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: 'queued',
  crawling: 'reading your site',
  processing: 'working',
  indexing: 'learning',
};

/** A crawl counts pages; a pasted note counts documents. Same column, different unit. */
const countNoun = (source: KnowledgeSource, count: number): string => {
  const noun = source.type === 'website' ? 'page' : 'document';
  return count === 1 ? noun : `${noun}s`;
};

function SourceList({
  sources,
  loading,
  agentId,
  onChanged,
  empty,
}: {
  sources: KnowledgeSource[];
  loading: boolean;
  agentId: string;
  onChanged: () => void;
  empty: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-2 px-6 py-5">
        <div className="h-4 w-52 animate-pulse rounded bg-[var(--surface-sunken)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--surface-sunken)]" />
      </div>
    );
  }
  if (sources.length === 0) return <>{empty}</>;

  return (
    <ul className="divide-y divide-[var(--border-default)]">
      {sources.map((source) => (
        <SourceRow key={source.id} source={source} agentId={agentId} onChanged={onChanged} />
      ))}
    </ul>
  );
}

function SourceRow({
  source,
  agentId,
  onChanged,
}: {
  source: KnowledgeSource;
  agentId: string;
  onChanged: () => void;
}) {
  const remove = useApiAction(async (auth) => {
    await api.delete(`/v1/agents/${agentId}/knowledge/${source.id}`, auth);
    onChanged();
  });

  const reindex = useApiAction(async (auth) => {
    await api.post(`/v1/agents/${agentId}/knowledge/${source.id}/reindex`, undefined, auth);
    onChanged();
  });

  return (
    <li className="flex items-start gap-4 px-6 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{source.title}</div>
        {source.location !== undefined && source.location !== null && (
          <div className="truncate text-[12px] text-muted">{source.location}</div>
        )}
        {source.errorMessage !== undefined && source.errorMessage !== null && (
          <div className="text-critical mt-1 text-[12px]">{source.errorMessage}</div>
        )}
        {(remove.error ?? reindex.error) !== undefined && (
          <div className="text-critical mt-1 text-[12px]">{remove.error ?? reindex.error}</div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {source.documentCount > 0 && (
          <span className="text-[12px] tabular-nums text-muted">
            {source.documentCount} {countNoun(source, source.documentCount)}
          </span>
        )}
        <Badge tone={STATUS_TONE[source.status] ?? 'caution'}>
          {STATUS_LABEL[source.status] ?? source.status}
        </Badge>
        {(source.status === 'failed' || source.status === 'pending') && (
          <Button size="sm" loading={reindex.busy} onClick={() => void reindex.run()}>
            Retry
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          loading={remove.busy}
          onClick={() => void remove.run()}
          aria-label={`Remove ${source.title}`}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}

function AddSourceDialog({
  kind,
  agentId,
  onClose,
  onAdded,
}: {
  kind: DialogKind;
  agentId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [url, setUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { run, busy, error } = useApiAction(async (auth) => {
    const base = `/v1/agents/${agentId}/knowledge`;
    if (kind === 'website') {
      const trimmed = url.trim();
      await api.post(
        `${base}/website`,
        { url: /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}` },
        auth,
      );
    } else if (kind === 'qa') {
      await api.post(`${base}/qa`, { question: question.trim(), answer: answer.trim() }, auth);
    } else {
      await api.post(`${base}/text`, { title: title.trim(), content: content.trim() }, auth);
    }
    onAdded();
  });

  const ready =
    kind === 'website'
      ? url.trim().length > 0
      : kind === 'qa'
        ? question.trim().length > 0 && answer.trim().length > 0
        : title.trim().length > 0 && content.trim().length > 0;

  const meta = {
    website: {
      title: 'Add website',
      description:
        'We read the pages, keep the text, and throw away navigation and boilerplate. Only pages your robots.txt allows.',
    },
    qa: {
      title: 'Add Q&A pair',
      description:
        'Write the question the way a customer would ask it, not the way you would title a help article.',
    },
    text: {
      title: 'Add text',
      description: 'Paste anything the agent should know that is not on your website.',
    },
  }[kind];

  return (
    <Dialog
      title={meta.title}
      description={meta.description}
      onClose={onClose}
      wide={kind !== 'website'}
    >
      <div className="space-y-4">
        {kind === 'website' && (
          <Field
            label="Website address"
            htmlFor="source-url"
            hint="We start here and follow internal links."
            error={error}
          >
            <TextInput
              id="source-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
          </Field>
        )}

        {kind === 'qa' && (
          <>
            <Field label="Question" htmlFor="source-question">
              <TextInput
                id="source-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="How long do I have to return something?"
                autoFocus
              />
            </Field>
            <Field label="Answer" htmlFor="source-answer" error={error}>
              <TextArea
                id="source-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="You have 30 days from delivery to start a return."
              />
            </Field>
          </>
        )}

        {kind === 'text' && (
          <>
            <Field label="Title" htmlFor="source-title" hint="Shown in citations.">
              <TextInput
                id="source-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Returns policy"
                autoFocus
              />
            </Field>
            <Field label="Content" htmlFor="source-content" error={error}>
              <TextArea
                id="source-content"
                className="min-h-48"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={!ready} onClick={() => void run()}>
          {kind === 'website' ? 'Add and crawl' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
