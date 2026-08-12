import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  Braces,
  CircleGauge,
  ClipboardCheck,
  Filter,
  Fingerprint,
  ScrollText,
} from 'lucide-react';
import { ProductTabs } from '@/components/ui/product-tabs';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Product',
  description:
    'See how Voomate’s Web, Voice Calling, and Integration Agents work as one controlled operating system.',
};

const TOOL_STEPS = [
  {
    phase: 'Resolve',
    title: 'Resolve the business',
    body: 'The request’s scoped key resolves to tenant context on the backend. The browser never supplies or receives the tenant ID.',
    Icon: Fingerprint,
  },
  {
    phase: 'Understand',
    title: 'Understand the request',
    body: 'The agent keeps the conversation context and determines whether the customer needs an answer, live information, or an action.',
    Icon: CircleGauge,
  },
  {
    phase: 'Ground',
    title: 'Retrieve approved knowledge',
    body: 'Business-specific facts come from tenant-scoped knowledge. Untrusted retrieved text remains reference data, never system instructions.',
    Icon: BookOpenText,
  },
  {
    phase: 'Gate',
    title: 'Select an allowed tool',
    body: 'When current data or an action is required, the runtime exposes only the typed tools enabled for that business.',
    Icon: Braces,
  },
  {
    phase: 'Validate',
    title: 'Validate and execute',
    body: 'The controlled execution layer checks the input and permissions, then calls the business system server-side with scoped credentials.',
    Icon: ClipboardCheck,
  },
  {
    phase: 'Filter',
    title: 'Filter the result',
    body: 'Only explicitly public-safe fields can enter the customer response. Internal notes, credentials, and private commercial fields stay out.',
    Icon: Filter,
  },
  {
    phase: 'Respond',
    title: 'Respond and log',
    body: 'The customer gets the useful result in the same thread while the decision, tool call, latency, and outcome are written to Logs.',
    Icon: ScrollText,
  },
];

export default function ProductPage() {
  return (
    <main className="marketing-main subpage product-page">
      <section className="subpage-hero product-hero" aria-labelledby="product-title">
        <div className="subpage-hero__aside" data-reveal>
          One operating system, three fixed agents
        </div>
        <h1 id="product-title" data-scrub>
          Built to answer.
          <br />
          Designed to finish the work.
        </h1>
        <p data-reveal>
          Voomate keeps customer conversations, business knowledge, live tools, approvals, and logs
          inside one controlled runtime. The channel can change without changing the brain.
        </p>
      </section>

      <section className="product-agent-section" aria-labelledby="agents-detail-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">The complete product</p>
            <h2 id="agents-detail-title" data-scrub>
              One role for every part of the customer journey.
            </h2>
          </div>
          <p data-reveal>
            Choose an agent to see its surface, shared context, connection path, and operating
            controls.
          </p>
        </div>
        <ProductTabs />
      </section>

      <section className="execution-section" aria-labelledby="execution-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">The secure execution harness</p>
            <h2 id="execution-title" data-scrub>
              What happens after a customer presses send.
            </h2>
          </div>
          <p data-reveal>
            Every step has a clear responsibility. The model can request work, but it never receives
            business credentials or unrestricted system access.
          </p>
        </div>
        <ol className="execution-steps">
          {TOOL_STEPS.map(({ phase, title, body, Icon }) => (
            <li key={phase} data-reveal>
              <div>
                <span>{phase}</span>
                <Icon size={20} strokeWidth={1.55} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="agent-connections" aria-labelledby="connections-title">
        <div>
          <p className="editorial-index">Simple connections, no workflow maze</p>
          <h2 id="connections-title" data-scrub>
            Two connection paths are enough.
          </h2>
          <p data-reveal>
            The Web Agent and Voice Calling Agent can each connect to the Integration Agent. That is
            how conversation channels gain business capabilities without turning setup into a node
            canvas.
          </p>
        </div>
        <div
          className="agent-connections__diagram"
          data-reveal
          aria-label="Voomate agent connection diagram"
        >
          <span className="connection-agent">
            Web Agent<small>chat + site voice</small>
          </span>
          <i />
          <span className="connection-agent connection-agent--core">
            Integration Agent<small>tools + systems</small>
          </span>
          <i />
          <span className="connection-agent">
            Voice Calling Agent<small>inbound + outbound</small>
          </span>
        </div>
      </section>

      <section className="product-controls" aria-labelledby="controls-title">
        <div className="section-heading">
          <p className="editorial-index">Operate with evidence</p>
          <h2 id="controls-title" data-scrub>
            Knowledge, permissions, approvals, and logs stay visible.
          </h2>
        </div>
        <div className="product-controls__grid">
          <article data-reveal>
            <span>Knowledge</span>
            <h3>Decide what the agent may use as business truth.</h3>
            <p>
              Sync public content, add approved text, and keep live facts in authenticated tools.
            </p>
          </article>
          <article data-reveal>
            <span>Permissions</span>
            <h3>Enable only the capabilities the business needs.</h3>
            <p>Tools are tenant-scoped and validated before execution.</p>
          </article>
          <article data-reveal>
            <span>Approvals</span>
            <h3>Pause sensitive work before it becomes irreversible.</h3>
            <p>Money-touching or high-risk actions can enter a review queue.</p>
          </article>
          <article data-reveal>
            <span>Logs</span>
            <h3>Trace what the system decided and why.</h3>
            <p>Conversation, retrieval, tool, latency, and usage events remain inspectable.</p>
          </article>
        </div>
      </section>

      <section className="subpage-cta">
        <h2 data-scrub>
          Start with one real workflow.
          <br />
          Expand from evidence.
        </h2>
        <div data-reveal>
          <a href={`${DASHBOARD_URL}/sign-in`} className="btn-ember">
            Start building <ArrowRight size={16} />
          </a>
          <Link href="/integrations" className="btn-quiet">
            Explore integrations
          </Link>
        </div>
      </section>
    </main>
  );
}
