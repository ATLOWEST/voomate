import { PageBody } from '@/components/shell/page-header';
import { Field, TextArea, TextInput } from '@/components/ui/field';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

export default function BehaviourPage() {
  return (
    <PageBody>
      <Panel>
        <PanelHeader
          title="Persona"
          description="How the agent introduces itself and how it sounds. Keep instructions about tone here; keep facts in Knowledge."
        />
        <PanelBody className="space-y-5">
          <Field label="Display name" htmlFor="persona-name" hint="Shown in the widget header.">
            <TextInput id="persona-name" placeholder="Assistant" />
          </Field>

          <Field
            label="Greeting"
            htmlFor="persona-greeting"
            hint="Spoken aloud on voice sessions, so keep it to one short sentence — long greetings get interrupted."
          >
            <TextInput id="persona-greeting" placeholder="Hi! How can I help?" />
          </Field>

          <Field
            label="Tone and instructions"
            htmlFor="persona-instructions"
            hint="Guidance, not facts. The agent answers from your knowledge base; this shapes how it phrases things."
          >
            <TextArea
              id="persona-instructions"
              placeholder="Be concise and warm. Use plain language. Never speculate about pricing."
            />
          </Field>
        </PanelBody>
        <PanelFooter>
          <Button variant="primary">Save</Button>
        </PanelFooter>
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
            hint="Used whenever retrieval returns nothing relevant. The agent will not answer from general knowledge."
          >
            <TextInput
              id="persona-fallback"
              defaultValue="I don't have that information yet — let me connect you with the team."
            />
          </Field>
        </PanelBody>
        <PanelFooter>
          <Button variant="primary">Save</Button>
        </PanelFooter>
      </Panel>
    </PageBody>
  );
}
