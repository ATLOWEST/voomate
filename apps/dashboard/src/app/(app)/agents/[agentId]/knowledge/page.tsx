import { PageBody } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';

/**
 * Knowledge.
 *
 * Three source types, in the order merchants use them: crawl the site, then patch the gaps
 * with Q&A pairs, then paste anything that lives nowhere on the web (return policy details,
 * internal pricing rules).
 */
export default function KnowledgePage() {
  return (
    <PageBody>
      <Panel>
        <PanelHeader
          title="Website"
          description="We crawl your site, respect robots.txt, and re-crawl on a schedule so answers follow your content."
          action={
            <Button variant="primary" size="sm">
              Add website
            </Button>
          }
        />
        <PanelBody className="p-0">
          <EmptyState
            title="No sources yet"
            description="Add your website URL to start. Crawling a typical marketing site takes a few minutes; you can keep working while it runs."
          />
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Q&A pairs"
          description="Exact answers for questions you care about getting exactly right — pricing, refunds, SLAs. These take priority over crawled content."
          action={<Button size="sm">Add pair</Button>}
        />
        <PanelBody>
          <p className="py-4 text-center text-[13px] text-muted">No Q&amp;A pairs yet.</p>
        </PanelBody>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Additional context"
          description="Anything that isn't on your website. Written here, it's treated the same as crawled content by retrieval."
          action={<Button size="sm">Add text</Button>}
        />
        <PanelBody>
          <p className="py-4 text-center text-[13px] text-muted">Nothing added yet.</p>
        </PanelBody>
      </Panel>
    </PageBody>
  );
}
