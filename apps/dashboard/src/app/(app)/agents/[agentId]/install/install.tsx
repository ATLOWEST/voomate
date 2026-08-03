'use client';

/**
 * Install.
 *
 * The plug-and-play promise lives or dies on this page. One snippet, no build step, no npm
 * package — a developer should be able to paste it into a CMS footer field and be done.
 */
import { useState } from 'react';
import type { Agent } from '@soniq/core';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field, TextInput } from '@/components/ui/field';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { api } from '@/lib/api';
import { useApiAction } from '@/lib/hooks';

const WIDGET_SRC = process.env.NEXT_PUBLIC_WIDGET_URL ?? 'https://cdn.soniq.example/soniq.js';

export function InstallPanels() {
  const { agent, refresh } = useAgent();

  const snippet = `<script
  src="${WIDGET_SRC}"
  data-soniq-key="${agent.embedKey}"
  data-soniq-position="${agent.appearance.position}"
  async
></script>`;

  return (
    <PageBody>
      {agent.status !== 'published' && (
        <div className="mb-4">
          <Callout tone="caution" title="This agent is still a draft">
            The snippet below will load, but the agent will not answer visitors until you press
            Publish. Test it on the Playground tab first.
          </Callout>
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Embed snippet"
          description="Paste this before the closing </body> tag on every page you want the assistant on."
          action={<CopyButton text={snippet} />}
        />
        <PanelBody className="p-0">
          <pre
            className="overflow-x-auto px-6 py-4 font-mono text-[12.5px] leading-relaxed"
            style={{ backgroundColor: 'var(--surface-sunken)' }}
          >
            <code>{snippet}</code>
          </pre>
        </PanelBody>
      </Panel>

      <AllowedOrigins agent={agent} onChanged={refresh} />

      <Panel className="mt-4">
        <PanelHeader
          title="Microphone permission"
          description="Voice needs HTTPS and a microphone prompt. Browsers only show that prompt after a click, so the first voice session always begins with the visitor pressing the mic button — never automatically."
        />
      </Panel>
    </PageBody>
  );
}

function AllowedOrigins({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const [draft, setDraft] = useState('');

  const save = useApiAction(async (auth, origins: string[]) => {
    await api.patch(`/v1/agents/${agent.id}`, { allowedOrigins: origins }, auth);
    onChanged();
  });

  const add = async () => {
    const origin = toOrigin(draft);
    if (origin === undefined) return;
    if (agent.allowedOrigins.includes(origin)) {
      setDraft('');
      return;
    }
    if (await save.run([...agent.allowedOrigins, origin])) setDraft('');
  };

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Allowed domains"
        description="The widget only loads on domains you list here. The embed key is public by design — it's visible in your page source — so this list, not the key, is what stops someone else from putting your agent on their site and running up your bill."
      />
      <PanelBody className="space-y-4">
        {agent.allowedOrigins.length > 0 && (
          <ul className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)]">
            {agent.allowedOrigins.map((origin) => (
              <li key={origin} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{origin}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={agent.allowedOrigins.length === 1}
                  title={
                    agent.allowedOrigins.length === 1
                      ? 'Removing the last domain would stop the widget loading anywhere.'
                      : undefined
                  }
                  onClick={() => {
                    void save.run(agent.allowedOrigins.filter((value) => value !== origin));
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Field
          label="Add a domain"
          htmlFor="origin-new"
          hint="Include the scheme, e.g. https://www.example.com. Subdomains are not automatically included."
          error={save.error}
        >
          <div className="flex gap-2">
            <TextInput
              id="origin-new"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="https://www.example.com"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void add();
              }}
            />
            <Button
              loading={save.busy}
              disabled={toOrigin(draft) === undefined}
              onClick={() => void add()}
            >
              Add
            </Button>
          </div>
        </Field>
      </PanelBody>
    </Panel>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

/**
 * The API wants a bare origin — scheme and host, no path. Doing the conversion here means a
 * merchant who pastes a full page URL gets the right thing rather than a validation error.
 */
const toOrigin = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return undefined;
  }
};
