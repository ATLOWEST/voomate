import type { Metadata } from 'next';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/json-ld';
import { siteUrl } from '@/lib/site-url';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Braces,
  Cable,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { IntegrationExplorer } from '@/components/ui/integration-explorer';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://app.atlowest.in';

export const metadata: Metadata = {
  title: 'Integrations — Connected Business Tools',
  description:
    'How Voomate connects approved business knowledge, live systems, and controlled action tools — including WhatsApp, Gmail, Razorpay, Shopify, and more.',
  openGraph: {
    title: 'Integrations — Connected Business Tools',
    description:
      'Connect WhatsApp, Gmail, Razorpay, Shopify, and more through controlled, approved action tools.',
    url: siteUrl('/integrations'),
    siteName: 'Voomate',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Integrations — Connected Business Tools',
    description:
      'Connect WhatsApp, Gmail, Razorpay, Shopify, and more through controlled, approved action tools.',
  },
  alternates: {
    canonical: '/integrations',
  },
};

export default function IntegrationsPage() {
  return (
    <main className="marketing-main subpage integrations-page">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Integrations', href: '/integrations' },
        ]}
      />
      <WebPageJsonLd
        name="Integrations — Connected Business Tools"
        description="How Voomate connects approved business knowledge, live systems, and controlled action tools."
        url="/integrations"
      />
      <section className="subpage-hero integrations-hero" aria-labelledby="integrations-title">
        <div className="subpage-hero__aside" data-reveal>
          Connect the systems where the work already lives
        </div>
        <h1 id="integrations-title" data-scrub>
          Current information in.
          <br />
          Controlled actions out.
        </h1>
        <p data-reveal>
          The Integration Agent gives Web and Voice conversations access to approved business
          capabilities while API credentials, validation, and execution stay server-side.
        </p>
      </section>

      <section className="integration-library" aria-labelledby="library-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">One universal tool library</p>
            <h2 id="library-title" data-scrub>
              Connect by capability, not by industry.
            </h2>
          </div>
          <p data-reveal>
            These are connection patterns. Each business enables only the adapters and tools it has
            configured and permitted.
          </p>
        </div>
        <IntegrationExplorer />
      </section>

      <section className="data-paths" aria-labelledby="data-paths-title">
        <div className="section-heading">
          <p className="editorial-index">Use the right data path</p>
          <h2 id="data-paths-title" data-scrub>
            Knowledge sync and live tools solve different problems.
          </h2>
          <p data-reveal>
            Keeping them separate improves freshness, authorization, cost control, and answer
            quality.
          </p>
        </div>
        <div className="data-paths__grid">
          <article data-reveal>
            <div>
              <BookOpenText size={23} />
              <span>Knowledge path</span>
            </div>
            <h3>For descriptive information that changes deliberately.</h3>
            <p>
              Product descriptions, services, policies, help content, and approved public facts can
              sync through the knowledge pipeline.
            </p>
            <ul>
              <li>
                <RefreshCw size={15} />
                Upsert by stable content ID
              </li>
              <li>
                <CheckCircle2 size={15} />
                Skip unchanged content by hash
              </li>
              <li>
                <ScrollText size={15} />
                Retrieve tenant-scoped context at answer time
              </li>
            </ul>
          </article>
          <article data-reveal>
            <div>
              <Cable size={23} />
              <span>Live tool path</span>
            </div>
            <h3>For information and actions that need authorization now.</h3>
            <p>
              Inventory, order status, appointments, payment state, and customer identity stay
              behind authenticated tools.
            </p>
            <ul>
              <li>
                <Braces size={15} />
                Validate a typed request schema
              </li>
              <li>
                <KeyRound size={15} />
                Use scoped credentials server-side
              </li>
              <li>
                <CheckCircle2 size={15} />
                Filter the result before responding
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="connect-sdk" aria-labelledby="sdk-title">
        <div>
          <p className="editorial-index">For teams with developers</p>
          <h2 id="sdk-title" data-scrub>
            Push approved content when it changes.
          </h2>
          <p data-reveal>
            <code>@voomate/connect</code> lets a trusted backend send public business content into
            the same knowledge pipeline. It retries quietly, deduplicates unchanged content, and
            keeps the tenant key out of browser code.
          </p>
        </div>
        <pre data-reveal aria-label="Voomate Connect example">
          <code>{`await voomate.sync({
  tenantKey: process.env.VOOMATE_TENANT_KEY,
  type: "product",
  id: product.id,
  content: publicProductContent,
  metadata: { sourceUrl: product.url }
});`}</code>
        </pre>
      </section>

      <section className="integration-security" aria-labelledby="integration-security-title">
        <div>
          <p className="editorial-index">A controlled connection boundary</p>
          <h2 id="integration-security-title" data-scrub>
            The model requests. The backend decides.
          </h2>
        </div>
        <ol data-reveal>
          <li>
            <span>Resolve</span>
            <strong>Resolve tenant</strong>
            <p>Derive tenant context from the scoped session or server key.</p>
          </li>
          <li>
            <span>Permit</span>
            <strong>Check permission</strong>
            <p>Confirm that the business enabled the requested tool.</p>
          </li>
          <li>
            <span>Validate</span>
            <strong>Validate input</strong>
            <p>Reject malformed or out-of-scope arguments before execution.</p>
          </li>
          <li>
            <span>Execute</span>
            <strong>Execute privately</strong>
            <p>Call the external system with server-held credentials.</p>
          </li>
          <li>
            <span>Filter</span>
            <strong>Filter and log</strong>
            <p>Return only safe fields and record the outcome for review.</p>
          </li>
        </ol>
      </section>

      <section className="subpage-cta">
        <h2 data-scrub>
          Connect one useful tool.
          <br />
          Prove the full loop.
        </h2>
        <div className="hero-actions--buttonless justify-center" data-reveal>
          <a href={`${DASHBOARD_URL}/sign-up`} className="hero-action-primary">
            <span>Create workspace</span>
            <ArrowRight size={18} />
          </a>
          <Link href="/product" className="hero-action-secondary">
            <span>See the product</span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
