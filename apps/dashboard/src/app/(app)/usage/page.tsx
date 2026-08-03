import type { Metadata } from 'next';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

export const metadata: Metadata = { title: 'Usage' };

/**
 * Usage.
 *
 * Voice minutes are the expensive unit — Transcribe streaming, Bedrock tokens, and Polly
 * characters all scale with them, and a merchant who discovers that at invoice time churns.
 * This page shows it as it accrues, not monthly in arrears.
 */
export default function UsagePage() {
  const rows = [
    { label: 'Voice minutes', value: '—', note: 'Speech in and out' },
    { label: 'Text messages', value: '—', note: 'Typed conversations' },
    { label: 'Pages indexed', value: '—', note: 'Across all agents' },
  ];

  return (
    <>
      <PageHeader title="Usage" description="Current billing period." />
      <PageBody>
        <Panel>
          <PanelHeader title="This period" />
          <PanelBody className="p-0">
            <ul className="divide-y divide-[var(--border-default)]">
              {rows.map((row) => (
                <li key={row.label} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <div className="text-[13.5px] font-medium">{row.label}</div>
                    <div className="text-[12px] text-muted">{row.note}</div>
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{row.value}</div>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </PageBody>
    </>
  );
}
