'use client';

/**
 * Behaviour.
 *
 * Persona only. Facts belong on the Knowledge tab, and keeping the two apart is not tidiness —
 * merchant persona text is treated as *instruction* by the prompt builder, while retrieved
 * page content is never allowed to instruct. A merchant who pastes their returns policy into
 * "instructions" gets an agent that recites it whether or not it was asked, and one that has
 * no citation to show for it.
 */
import { useState } from 'react';
import { useAgent } from '@/components/agent/shell';
import { PageBody } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/panel';
import { api } from '@/lib/api';
import { useApiAction } from '@/lib/hooks';

const TONES = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'concise', label: 'Concise' },
  { value: 'warm', label: 'Warm' },
] as const;

export function BehaviourForm() {
  const { agent, refresh } = useAgent();
  const persona = agent.persona;

  const [displayName, setDisplayName] = useState(persona.displayName);
  const [tone, setTone] = useState<string>(persona.tone);
  const [greeting, setGreeting] = useState(persona.greeting ?? '');
  const [instructions, setInstructions] = useState(persona.instructions ?? '');
  const [fallback, setFallback] = useState(persona.fallbackMessage ?? '');
  const [saved, setSaved] = useState(false);

  const save = useApiAction(async (auth) => {
    await api.patch(
      `/v1/agents/${agent.id}`,
      {
        persona: {
          displayName: displayName.trim(),
          tone,
          // Empty strings are omitted rather than sent: the contract treats these as optional,
          // and an empty greeting should mean "no greeting", not a blank line spoken aloud.
          ...(greeting.trim().length > 0 ? { greeting: greeting.trim() } : {}),
          ...(instructions.trim().length > 0 ? { instructions: instructions.trim() } : {}),
          ...(fallback.trim().length > 0 ? { fallbackMessage: fallback.trim() } : {}),
        },
      },
      auth,
    );
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  });

  const dirty =
    displayName !== persona.displayName ||
    tone !== persona.tone ||
    greeting !== (persona.greeting ?? '') ||
    instructions !== (persona.instructions ?? '') ||
    fallback !== (persona.fallbackMessage ?? '');

  return (
    <PageBody>
      {save.error !== undefined && (
        <div className="mb-4">
          <Callout tone="critical" title="Could not save">
            {save.error}
          </Callout>
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Persona"
          description="How the agent introduces itself and how it sounds. Keep tone here; keep facts in Knowledge."
        />
        <PanelBody className="space-y-5">
          <Field
            label="Display name"
            htmlFor="persona-name"
            hint="Shown in the widget header and used when the agent introduces itself."
          >
            <TextInput
              id="persona-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Assistant"
            />
          </Field>

          <Field label="Tone" htmlFor="persona-tone" hint="Shapes phrasing, not content.">
            <div className="flex flex-wrap gap-2" id="persona-tone">
              {TONES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  aria-pressed={tone === option.value}
                  className={
                    tone === option.value
                      ? 'border-accent-500 bg-accent-50 text-accent-700 rounded-lg border px-3 py-1.5 text-[13px] font-medium'
                      : 'rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[13px] text-secondary transition-colors hover:bg-[var(--surface-hover)]'
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Greeting"
            htmlFor="persona-greeting"
            hint="Spoken aloud on voice calls, so keep it to one short sentence — long greetings get interrupted."
          >
            <TextInput
              id="persona-greeting"
              value={greeting}
              onChange={(event) => setGreeting(event.target.value)}
              placeholder="Hi! How can I help?"
              maxLength={280}
            />
          </Field>

          <Field
            label="Tone and instructions"
            htmlFor="persona-instructions"
            hint="Guidance, not facts. The agent answers from your knowledge base; this shapes how it phrases things."
          >
            <TextArea
              id="persona-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Be concise and warm. Use plain language. Never speculate about pricing."
              maxLength={4000}
            />
          </Field>
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="When the agent doesn't know"
          description="The single most important behaviour setting. An agent that invents an answer costs more trust than one that admits a gap."
        />
        <PanelBody>
          <Field
            label="Fallback response"
            htmlFor="persona-fallback"
            hint="Used whenever the search finds nothing relevant. The agent will not fall back to general knowledge."
          >
            <TextInput
              id="persona-fallback"
              value={fallback}
              onChange={(event) => setFallback(event.target.value)}
              placeholder="I don't have that information yet — let me connect you with the team."
              maxLength={280}
            />
          </Field>
        </PanelBody>
        <PanelFooter>
          {saved && <span className="text-positive mr-auto text-[13px]">Saved</span>}
          <Button
            variant="primary"
            loading={save.busy}
            disabled={!dirty || displayName.trim().length === 0}
            onClick={() => void save.run()}
          >
            Save changes
          </Button>
        </PanelFooter>
      </Panel>
    </PageBody>
  );
}
