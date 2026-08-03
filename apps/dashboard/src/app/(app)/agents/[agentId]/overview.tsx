'use client';

/**
 * Overview.
 *
 * Before an agent has taken any conversations, the useful thing on this page is not a wall of
 * zeroes — it is "what is left to do". So the checklist leads, and the metrics sit under it
 * showing honest dashes until there is traffic to count.
 *
 * The metric that will belong at the top once traffic exists is **deflection**: how many
 * conversations ended without the visitor asking for a human. That is what the merchant pays
 * for. Conversation counts are vanity numbers.
 */
import Link from 'next/link';
import type { KnowledgeSource } from '@soniq/core';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { useApiQuery } from '@/lib/hooks';

export function AgentOverview() {
  const { agent } = useAgent();
  const { data } = useApiQuery<{ sources: KnowledgeSource[] }>(`/v1/agents/${agent.id}/knowledge`);

  const sources = data?.sources;
  const ready = sources?.filter((source) => source.status === 'ready') ?? [];
  const base = `/agents/${agent.id}`;

  const steps = [
    {
      done: (sources?.length ?? 0) > 0,
      title: 'Add what the agent should know',
      detail:
        'Crawl your website, or paste a few Q&A pairs. Without this the agent has nothing to answer from.',
      href: `${base}/knowledge`,
      cta: 'Go to Knowledge',
    },
    {
      done: ready.length > 0,
      title: 'Try it in the playground',
      detail:
        'Ask the questions your customers actually ask. Every answer shows which content it came from.',
      href: `${base}/playground`,
      cta: 'Open Playground',
    },
    {
      done: agent.status === 'published',
      title: 'Publish and install',
      detail: 'Paste one line of code into your site. The agent starts answering visitors.',
      href: `${base}/install`,
      cta: 'Get the snippet',
    },
  ];

  const metrics = [
    { label: 'Conversations', value: '—', hint: 'Last 7 days' },
    { label: 'Resolved without handoff', value: '—', hint: 'Deflection rate' },
    { label: 'Indexed sources', value: String(ready.length), hint: 'Ready to answer from' },
    { label: 'Median response', value: '—', hint: 'Speech-to-speech' },
  ];

  return (
    <PageBody>
      {agent.status !== 'published' && (
        <Panel className="mb-4">
          <PanelHeader
            title="Getting this agent live"
            description="Three steps. The first one is the one that matters."
          />
          <PanelBody className="p-0">
            <ol className="divide-y divide-[var(--border-default)]">
              {steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3.5 px-6 py-4">
                  <span
                    className={
                      step.done
                        ? 'bg-positive mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white'
                        : 'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] text-[11px] font-semibold text-secondary'
                    }
                  >
                    {step.done ? '✓' : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{step.title}</div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-secondary">
                      {step.detail}
                    </p>
                  </div>
                  <Link
                    href={step.href}
                    className="text-accent-600 hover:text-accent-700 shrink-0 text-[13px] font-medium"
                  >
                    {step.cta} →
                  </Link>
                </li>
              ))}
            </ol>
          </PanelBody>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="surface-panel px-4 py-3.5">
            <div className="text-[12px] font-medium text-secondary">{metric.label}</div>
            <div className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              {metric.value}
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted">{metric.hint}</div>
          </div>
        ))}
      </div>

      <Panel className="mt-4">
        <PanelHeader
          title="Unanswered questions"
          description="Questions the agent could not answer from your knowledge base. This is the highest-value list in the product — each entry is a gap you can close by adding one piece of content."
        />
        <PanelBody>
          <p className="py-6 text-center text-[13px] text-muted">
            Nothing yet. Gaps appear here once the agent starts taking conversations.
          </p>
        </PanelBody>
      </Panel>
    </PageBody>
  );
}
