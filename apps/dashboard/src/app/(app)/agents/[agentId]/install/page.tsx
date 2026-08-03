import { PageBody } from '@/components/shell/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

/**
 * Install.
 *
 * The plug-and-play promise lives or dies on this page. One snippet, no build step, no npm
 * package. A developer should be able to paste it into a CMS footer field and be done.
 */
export default function InstallPage() {
  const embedKey = 'sq_your_embed_key';
  const snippet = `<script
  src="https://cdn.soniq.example/soniq.js"
  data-soniq-key="${embedKey}"
  data-soniq-position="bottom-right"
  async
></script>`;

  return (
    <PageBody>
      <Panel>
        <PanelHeader
          title="Embed snippet"
          description="Paste this before the closing </body> tag on every page you want the assistant on."
          action={<Button size="sm">Copy</Button>}
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

      <Panel className="mt-4">
        <PanelHeader
          title="Allowed domains"
          description="The widget only loads on domains you list here. The embed key is public by design — it's visible in your page source — so this list, not the key, is what stops someone else from putting your agent on their site and running up your usage."
          action={<Button size="sm">Add domain</Button>}
        />
        <PanelBody className="space-y-4">
          <Field
            label="Domain"
            htmlFor="origin-new"
            hint="Include the scheme, e.g. https://www.example.com. Subdomains are not automatically included."
          >
            <TextInput id="origin-new" placeholder="https://www.example.com" />
          </Field>
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Microphone permission"
          description="Voice needs HTTPS and a microphone prompt. Browsers only show that prompt after a click, so the first voice session always begins with the visitor pressing the mic button — never automatically."
        />
      </Panel>
    </PageBody>
  );
}
