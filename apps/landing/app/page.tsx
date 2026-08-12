import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck2,
  Check,
  CircleDot,
  DatabaseZap,
  Globe2,
  Headphones,
  MessageSquareText,
  Mic2,
  PackageCheck,
  PlugZap,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { OperatingFlow } from '@/components/ui/operating-flow';
import { UseCaseAccordion } from '@/components/ui/use-case-accordion';
import { IntegrationExplorer } from '@/components/ui/integration-explorer';
import { LaunchStudio } from '@/components/ui/launch-studio';
import { OutcomeCarousel } from '@/components/ui/outcome-carousel';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Voomate — One AI team for every customer conversation',
  description:
    'Voomate connects a Web Agent, Voice Calling Agent, and Integration Agent so businesses can answer customers and complete approved work from one shared system.',
  keywords: [
    'AI voice agent',
    'AI web agent',
    'customer service automation',
    'AI business operations',
    'AI website widget',
  ],
  openGraph: {
    type: 'website',
    title: 'Voomate — One AI team for every customer conversation',
    description: 'Answer, understand, and act across chat, voice, and connected business tools.',
    siteName: 'Voomate',
  },
  robots: { index: true, follow: true },
};

const SIGNALS = [
  'Website conversations',
  'Natural voice',
  'Grounded answers',
  'Order actions',
  'Bookings',
  'Human handoff',
  'Tenant-isolated data',
];

export default function HomePage() {
  return (
    <main className="marketing-main">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-status" data-reveal>
          <span>
            <CircleDot size={14} /> Your customer operation, connected
          </span>
          <a href="#features">
            Meet the team <ArrowDown size={14} />
          </a>
        </div>

        <div className="hero-copy">
          <h1 id="home-title" data-scrub>
            <span>Your business deserves</span>
            <span>
              an AI team
              <span className="headline-pulse" aria-hidden="true">
                <Image src="/agent-pulse.svg" alt="" width={240} height={96} priority />
              </span>
              that
            </span>
            <span className="hero-ember-line">never clocks out.</span>
          </h1>
          <p data-reveal>
            Voomate gives your business three connected agents that speak with customers, find the
            right information, and safely complete approved work across your tools.
          </p>
          <div className="hero-actions" data-reveal>
            <a href={`${DASHBOARD_URL}/sign-in`} className="btn-ember">
              Build your AI team <ArrowRight size={17} />
            </a>
            <Link href="/#how-it-works" className="btn-quiet">
              See how it works
            </Link>
          </div>
        </div>

        <div className="hero-operation" data-reveal>
          <div className="hero-operation__header">
            <div>
              <span className="live-mark">
                <Sparkles size={15} />
              </span>
              <div>
                <strong>Voomate operation</strong>
                <small>One shared conversation</small>
              </div>
            </div>
            <span className="live-status">
              <i /> Live
            </span>
          </div>

          <div className="hero-operation__body">
            <article className="request-card">
              <span>A</span>
              <div>
                <small>Customer asks</small>
                <p>“Can you help me choose the right plan and book a demo?”</p>
              </div>
            </article>

            <div className="operation-path" aria-label="Voomate request path">
              <span>
                <MessageSquareText size={16} /> Understand
              </span>
              <i />
              <span>
                <DatabaseZap size={16} /> Ground
              </span>
              <i />
              <span>
                <PlugZap size={16} /> Act
              </span>
            </div>

            <article className="result-card">
              <span>
                <Check size={16} />
              </span>
              <div>
                <small>Your AI team</small>
                <p>
                  Explained the plans, checked a connected calendar, and offered an available slot.
                </p>
              </div>
              <strong>Complete</strong>
            </article>
          </div>

          <div className="hero-operation__footer">
            <span>
              <MessageSquareText size={14} /> Web chat
            </span>
            <span>
              <Mic2 size={14} /> Website voice
            </span>
            <span>
              <Headphones size={14} /> Phone calls
            </span>
          </div>
        </div>
      </section>

      <div className="signal-marquee" aria-label="Voomate capabilities">
        <div className="signal-marquee__track animate-marquee">
          {[...SIGNALS, ...SIGNALS].map((signal, index) => (
            <span key={`${signal}-${index}`}>
              <i />
              {signal}
            </span>
          ))}
        </div>
      </div>

      <section className="launch-section" id="how-it-works" aria-labelledby="launch-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">Plug in. Connect. Go live.</p>
            <h2 id="launch-title" data-scrub>
              From website to working agent in three clear moves.
            </h2>
          </div>
          <p data-reveal>
            Voomate is designed to start small: install the widget, connect approved business truth,
            then test a real workflow before publishing it.
          </p>
        </div>
        <LaunchStudio />
      </section>

      <section className="agents-section" id="features" aria-labelledby="agents-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">The Voomate team</p>
            <h2 id="agents-title" data-scrub>
              Three agents.
              <br />
              One operation.
            </h2>
          </div>
          <p data-reveal>
            Not a collection of disconnected bots. Every agent shares the same business knowledge,
            conversation context, safety rules, and permission layer.
          </p>
        </div>

        <div className="agent-bento">
          <article className="agent-card agent-card--web" data-reveal>
            <div className="agent-card__head">
              <span className="agent-symbol">
                <MessageSquareText size={21} />
              </span>
              <div>
                <h3>Web Agent</h3>
              </div>
              <span className="agent-state">
                <i /> On your site
              </span>
            </div>
            <p className="agent-card__lead">
              A fast, embeddable conversation layer that answers questions and carries out approved
              actions without sending a customer somewhere else.
            </p>
            <div className="web-agent-demo" aria-hidden="true">
              <div className="demo-message demo-message--customer">Can you check order 1001?</div>
              <div className="demo-thinking">
                <span />
                <span />
                <span /> Checking your order
              </div>
              <div className="demo-message demo-message--agent">
                It shipped today and is due Friday. I can also help update the delivery details.
              </div>
            </div>
            <ul className="agent-capabilities">
              <li>
                <Globe2 size={16} /> Chat and website voice
              </li>
              <li>
                <PackageCheck size={16} /> Live tool results
              </li>
              <li>
                <ShieldCheck size={16} /> Public-safe responses
              </li>
            </ul>
          </article>

          <article className="agent-card agent-card--voice" data-reveal>
            <div className="agent-card__head">
              <span className="agent-symbol agent-symbol--dark">
                <Mic2 size={21} />
              </span>
              <div>
                <h3>Voice Calling Agent</h3>
              </div>
            </div>
            <p>
              Natural voice conversations that keep context and can move smoothly between listening,
              thinking, speaking, and interruption.
            </p>
            <div className="voice-line" aria-hidden="true">
              {[16, 30, 22, 48, 34, 60, 28, 44, 20, 52, 26, 38].map((height, index) => (
                <i key={index} style={{ height }} />
              ))}
            </div>
          </article>

          <article className="agent-card agent-card--integration" data-reveal>
            <div className="agent-card__head">
              <span className="agent-symbol">
                <Workflow size={21} />
              </span>
              <div>
                <h3>Integration Agent</h3>
              </div>
            </div>
            <p>
              Connects approved business systems so customer requests can become controlled,
              validated actions.
            </p>
            <div className="integration-line" aria-hidden="true">
              <span>
                <ShoppingCart size={17} />
              </span>
              <i />
              <span>
                <DatabaseZap size={17} />
              </span>
              <i />
              <span>
                <CalendarCheck2 size={17} />
              </span>
            </div>
          </article>
        </div>
        <div className="section-link-row" data-reveal>
          <Link href="/product">
            Explore the complete product <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <div id="working-loop">
        <OperatingFlow />
      </div>

      <section className="home-integration-section" aria-labelledby="home-integrations-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">Knowledge when it is stable. Tools when it is live.</p>
            <h2 id="home-integrations-title" data-scrub>
              Connect the capability, not an industry template.
            </h2>
          </div>
          <p data-reveal>
            The Integration Agent can expose approved action, communication, and system-connection
            tools to Web and Voice conversations. The model requests; the controlled backend
            decides.
          </p>
        </div>
        <IntegrationExplorer />
        <div className="section-link-row" data-reveal>
          <Link href="/integrations">
            See integration architecture <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="use-cases-section" aria-labelledby="use-cases-title">
        <div className="section-heading">
          <p className="editorial-index">Made to understand your business</p>
          <h2 id="use-cases-title" data-scrub>
            Different work.
            <br />
            The same connected system.
          </h2>
          <p data-reveal>
            Voomate does not lock a business into an industry template. It learns from that
            business’s approved knowledge and uses only the tools that business has connected.
          </p>
        </div>
        <UseCaseAccordion />
        <div className="section-link-row" data-reveal>
          <Link href="/industries">
            Explore more workflows <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="trust-section" aria-labelledby="trust-title">
        <div className="trust-copy">
          <p className="editorial-index">Control stays with you</p>
          <h2 id="trust-title" data-scrub>
            Helpful on the surface.
            <br />
            Disciplined underneath.
          </h2>
          <p data-reveal>
            Customer-facing responses are separated from private business data. Actions run through
            a controlled tool layer, and every tenant’s information stays isolated.
          </p>
        </div>
        <div className="trust-grid" data-reveal>
          <article>
            <ShieldCheck size={22} />
            <h3>Permissioned actions</h3>
            <p>Each tool is checked against the business’s allowed capabilities before it runs.</p>
          </article>
          <article>
            <DatabaseZap size={22} />
            <h3>Grounded answers</h3>
            <p>
              Business questions use approved knowledge and connected live data rather than guesses.
            </p>
          </article>
          <article>
            <Globe2 size={22} />
            <h3>Tenant isolation</h3>
            <p>Public widget keys resolve to private tenant context only on the backend.</p>
          </article>
        </div>
      </section>

      <section className="outcomes-section" aria-labelledby="outcomes-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">One event, three useful views</p>
            <h2 id="outcomes-title" data-scrub>
              Simple for customers. Visible for operators.
            </h2>
          </div>
          <p data-reveal>
            A polished conversation is only half the product. The business also gets the evidence,
            controls, and traceability needed to operate it responsibly.
          </p>
        </div>
        <OutcomeCarousel />
      </section>

      <section className="closing-cta" aria-labelledby="closing-title">
        <div className="closing-cta__signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h2 id="closing-title" data-scrub>
          Give every customer
          <br />a clear next step.
        </h2>
        <p data-reveal>
          Start with the same three-agent system and connect only the knowledge and actions your
          business needs.
        </p>
        <div className="hero-actions" data-reveal>
          <a href={`${DASHBOARD_URL}/sign-in`} className="btn-ember">
            Start building <ArrowRight size={17} />
          </a>
          <Link href="/pricing" className="btn-quiet">
            View pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
