import type { Metadata } from 'next';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/json-ld';
import { siteUrl } from '@/lib/site-url';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  Workflow,
} from 'lucide-react';
import { WORKFLOW_USE_CASES, UseCaseAccordion } from '@/components/ui/use-case-accordion';


export const metadata: Metadata = {
  title: 'Industries — Voomate Use Cases',
  description:
    'See how Voomate adapts to any business through tenant knowledge, live tools, and controlled workflow permissions without rigid industry templates.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Industries — Voomate Use Cases',
    description:
      'One connected AI operating system for retail, healthcare, real estate, software, and more.',
    url: siteUrl('/industries'),
    siteName: 'Voomate',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Industries — Voomate Use Cases',
    description:
      'One connected AI operating system for retail, healthcare, real estate, software, and more.',
  },
  alternates: {
    canonical: '/industries',
  },
};

const CONTEXTS = [
  'Online commerce',
  'Retail',
  'Clinics',
  'Professional services',
  'Restaurants',
  'Hospitality',
  'Education',
  'Real estate',
  'Software',
  'Financial operations',
  'Automotive services',
  'Custom business systems',
];

const WORKFLOW_EXAMPLES = [
  {
    request: '“Which option fits what I need?”',
    source: 'Approved catalogue or service knowledge',
    tool: 'Search or availability tool',
    outcome: 'A grounded recommendation and next step',
  },
  {
    request: '“Where is my order or request?”',
    source: 'Verified customer and reference details',
    tool: 'Status lookup tool',
    outcome: 'Only the public-safe status fields',
  },
  {
    request: '“Can I book for Friday afternoon?”',
    source: 'Service rules and required details',
    tool: 'Calendar availability and booking',
    outcome: 'Confirmed slot after customer approval',
  },
  {
    request: '“Please have someone contact me.”',
    source: 'Conversation summary and consented contact fields',
    tool: 'CRM, ticket, or escalation tool',
    outcome: 'A traceable handoff with context',
  },
];

export default function IndustriesPage() {
  return (
    <main className="marketing-main subpage industries-page">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Industries', href: '/industries' },
        ]}
      />
      <WebPageJsonLd
        name="Industries — Voomate Use Cases"
        description="See how Voomate adapts to any business through tenant knowledge, live tools, and controlled workflow permissions."
        url="/industries"
      />
      <section className="subpage-hero" aria-labelledby="industries-title">
        <div className="subpage-hero__aside" data-reveal>
          Universal by architecture, specific through your data
        </div>
        <h1 id="industries-title" data-scrub>
          Built around the job.
          <br />
          Never boxed into an industry.
        </h1>
        <p data-reveal>
          The same three agents can support any business that handles customer conversations. What
          changes is the business’s approved knowledge, live systems, vocabulary, and permissions.
        </p>
      </section>

      <section className="industry-principle" aria-labelledby="principle-title">
        <div className="industry-principle__copy">
          <p className="editorial-index">What creates the business fit</p>
          <h2 id="principle-title" data-scrub>
            Four inputs shape every workflow.
          </h2>
          <p data-reveal>
            No preset decides how the agent behaves. The tenant’s real configuration does.
          </p>
        </div>
        <div className="industry-principle__agents" data-reveal>
          <article>
            <BookOpenText size={21} />
            <strong>Knowledge</strong>
            <p>Approved descriptions, policies, services, products, and help content.</p>
          </article>
          <article>
            <Activity size={21} />
            <strong>Live data</strong>
            <p>Current orders, availability, payments, inventory, and account facts.</p>
          </article>
          <article>
            <Workflow size={21} />
            <strong>Tools</strong>
            <p>Typed actions that the business has deliberately enabled.</p>
          </article>
          <article>
            <ClipboardCheck size={21} />
            <strong>Controls</strong>
            <p>Identity checks, confirmation, approval thresholds, and human handoff.</p>
          </article>
        </div>
      </section>

      <section className="industry-examples" aria-labelledby="examples-title">
        <div className="section-heading">
          <p className="editorial-index">Reusable jobs, not vertical templates</p>
          <h2 id="examples-title" data-scrub>
            Build around what the customer needs done.
          </h2>
          <p data-reveal>
            Combine these workflow patterns in any business. The runtime stays the same while the
            knowledge, tool schemas, and permissions remain tenant-specific.
          </p>
        </div>
        <UseCaseAccordion cases={WORKFLOW_USE_CASES} />
      </section>

      <section className="market-contexts" aria-labelledby="contexts-title">
        <div>
          <p className="editorial-index">Examples, never a limit</p>
          <h2 id="contexts-title" data-scrub>
            One platform can meet customers wherever work begins.
          </h2>
          <p data-reveal>
            These contexts illustrate the range. They are not plans, presets, or the boundary of who
            Voomate can serve.
          </p>
        </div>
        <div className="market-contexts__list" data-reveal>
          {CONTEXTS.map((context) => (
            <span key={context}>
              <i aria-hidden="true" />
              {context}
            </span>
          ))}
        </div>
      </section>

      <section className="workflow-examples" aria-labelledby="workflow-examples-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">From question to outcome</p>
            <h2 id="workflow-examples-title" data-scrub>
              Concrete workflows, explained end to end.
            </h2>
          </div>
          <p data-reveal>
            Each example shows the customer request, the trusted source, the tool boundary, and the
            response that comes back.
          </p>
        </div>
        <div className="workflow-examples__table" data-reveal>
          <div className="workflow-examples__head">
            <span>Customer request</span>
            <span>Grounding source</span>
            <span>Tool path</span>
            <span>Customer outcome</span>
          </div>
          {WORKFLOW_EXAMPLES.map((item) => (
            <article key={item.request}>
              <strong>
                <MessageSquareText size={17} />
                {item.request}
              </strong>
              <span>{item.source}</span>
              <span>{item.tool}</span>
              <span>
                <CheckCircle2 size={15} />
                {item.outcome}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="context-loop" aria-labelledby="context-title">
        <div className="context-loop__visual" data-reveal>
          <span className="context-node context-node--customer">Customer</span>
          <span className="context-node context-node--knowledge">Knowledge</span>
          <span className="context-node context-node--tools">Tools</span>
          <span className="context-node context-node--agent">Voomate</span>
        </div>
        <div>
          <p className="editorial-index">What actually personalizes it</p>
          <h2 id="context-title" data-scrub>
            Your content and tools create the specialization.
          </h2>
          <p data-reveal>
            Product descriptions, policies, service details, live inventory, calendars, order
            systems, and business rules make an agent useful. Voomate keeps that context
            tenant-scoped and applies the same controlled runtime in every business.
          </p>
        </div>
      </section>

      <section className="subpage-cta">
        <h2 data-scrub>
          Bring the workflow.
          <br />
          Keep one controlled system.
        </h2>
        <div className="hero-actions--buttonless justify-center" data-reveal>
          <Link href="/sign-up" className="hero-action-primary">
            <span>Start now</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/product" className="hero-action-secondary">
            <span>Explore capabilities</span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
