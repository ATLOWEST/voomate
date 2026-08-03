import type { Metadata } from 'next';
import { PageBody, PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/ui/panel';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Organization, members, and API access." />
      <PageBody>
        <Panel>
          <PanelHeader title="Organization" />
          <PanelBody className="space-y-5">
            <Field label="Name" htmlFor="org-name">
              <TextInput id="org-name" placeholder="Acme Inc." />
            </Field>
            <Field
              label="Slug"
              htmlFor="org-slug"
              hint="Used in URLs. Changing it breaks existing links."
            >
              <TextInput id="org-slug" placeholder="acme" />
            </Field>
          </PanelBody>
          <PanelFooter>
            <Button variant="primary">Save</Button>
          </PanelFooter>
        </Panel>

        <Panel className="mt-4">
          <PanelHeader
            title="Members"
            description="Owners and admins can change billing and delete agents. Developers can install and configure. Viewers can read conversations only."
            action={<Button size="sm">Invite</Button>}
          />
          <PanelBody>
            <p className="py-4 text-center text-[13px] text-muted">No members loaded.</p>
          </PanelBody>
        </Panel>

        <Panel className="mt-4">
          <PanelHeader
            title="API keys"
            description="For server-side access to conversations and knowledge. Shown once at creation — we store only a hash and cannot recover it."
            action={<Button size="sm">Create key</Button>}
          />
          <PanelBody>
            <p className="py-4 text-center text-[13px] text-muted">No keys yet.</p>
          </PanelBody>
        </Panel>

        <Panel className="mt-4">
          <PanelHeader
            title="Danger zone"
            description="Deleting an organization removes its agents, knowledge bases, and conversation history. This cannot be undone."
            action={
              <Button size="sm" variant="danger">
                Delete organization
              </Button>
            }
          />
        </Panel>
      </PageBody>
    </>
  );
}
