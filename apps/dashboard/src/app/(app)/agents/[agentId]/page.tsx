import { PageBody } from '@/components/shell/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

/**
 * Overview.
 *
 * The metric that belongs at the top of this page is **deflection** — how many conversations
 * ended without the visitor asking for a human. That is what the merchant is paying for.
 * Conversation counts and message volume are vanity numbers; they go below the fold.
 */
export default function AgentOverviewPage() {
  const metrics = [
    { label: 'Conversations', value: '—', hint: 'Last 7 days' },
    { label: 'Resolved without handoff', value: '—', hint: 'Deflection rate' },
    { label: 'Voice sessions', value: '—', hint: 'Share of total' },
    { label: 'Median response', value: '—', hint: 'Speech-to-speech' },
  ];

  return (
    <PageBody>
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
