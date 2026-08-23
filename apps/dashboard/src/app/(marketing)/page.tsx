import type { Metadata } from 'next';
import { SoftwareApplicationJsonLd } from '@/components/seo/json-ld';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  DatabaseZap,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import { OperatingFlow } from '@/components/ui/operating-flow';
import { UseCaseAccordion } from '@/components/ui/use-case-accordion';
import { OutcomeCarousel } from '@/components/ui/outcome-carousel';
import { TryNowButton } from '@/components/ui/try-now-button';
import { SITE_URL } from '@/lib/site-url';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? '';

export const metadata: Metadata = {
  title: 'Voomate — One AI team for every customer conversation',
  description:
    'Voomate is an AI operating system that connects a Web Agent, Voice Calling Agent, and Integration Agent so businesses can answer customers and complete approved work from one shared system.',
  robots: { index: false, follow: false },
  keywords: [
    'AI voice agent',
    'AI web agent',
    'customer service automation',
    'AI business operations',
    'AI website widget',
    'AI operating system for business',
    'voice AI customer support',
  ],
  openGraph: {
    type: 'website',
    title: 'Voomate — One AI team for every customer conversation',
    description: 'Answer, understand, and act across chat, voice, and connected business tools.',
    siteName: 'Voomate',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voomate — One AI team for every customer conversation',
    description:
      'AI operating system connecting web, voice, and integration agents for customer conversations.',
  },
  alternates: {
    canonical: '/',
  },
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
      <SoftwareApplicationJsonLd />
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
            <span>The Agentic OS</span>
            <span>that connects you to</span>
            <span className="hero-ember-shiny">your customers.</span>
          </h1>
          <div className="hero-actions hero-actions--buttonless" data-reveal>
            <Link href="/overview" className="hero-action-primary">
              <span>Start now</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/#features" className="hero-action-secondary">
              <span>See how it works</span>
              <ArrowUpRight size={17} />
            </Link>
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
              <div>
                <h3>Web Agent</h3>
              </div>
            </div>
            <p className="agent-card__lead">
              A fast, embeddable conversation layer that answers questions and carries out approved
              actions without sending a customer somewhere else.
            </p>
            <div className="web-agent-demo" aria-hidden="true">
              <div className="demo-message demo-message--customer">
                Hi, where is my order #5821?
              </div>
              <div className="demo-thinking">
                <span />
                <span />
                <span /> Looking up your order
              </div>
              <div className="demo-message demo-message--agent">
                Order #5821 has been picked up by Delhivery and is out for delivery today — expected
                by 6 PM.
              </div>
              <div className="demo-message demo-message--customer">
                Can you change the delivery address?
              </div>
              <div className="demo-thinking">
                <span />
                <span />
                <span /> Checking update eligibility
              </div>
              <div className="demo-message demo-message--agent">
                Done! Address updated. You&apos;ll receive a confirmation SMS shortly. Anything else
                I can help with?
              </div>
            </div>
            <TryNowButton />
          </article>

          <article className="agent-card agent-card--voice" data-reveal>
            <div className="agent-card__head">
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
              <div>
                <h3>Integration Agent</h3>
              </div>
            </div>
            <p>
              Connects approved business systems so customer requests become controlled, validated
              actions — across messaging, logistics, payments, and more.
            </p>
            {/* Standalone logos — no circles, no text */}
            <div className="integration-logo-grid" aria-hidden="true">
              <Image
                src="/logos/whatsapp.svg"
                alt="WhatsApp"
                width={36}
                height={36}
                title="WhatsApp"
              />
              <Image src="/logos/gmail.svg" alt="Gmail" width={36} height={36} title="Gmail" />
              <Image
                src="/logos/delhivery.svg"
                alt="Delhivery"
                width={36}
                height={36}
                title="Delhivery"
              />
              <Image
                src="/logos/razorpay.svg"
                alt="Razorpay"
                width={36}
                height={36}
                title="Razorpay"
              />
              <Image
                src="/logos/google-calendar.svg"
                alt="Google Calendar"
                width={36}
                height={36}
                title="Google Calendar"
              />
              <Image
                src="/logos/instagram.svg"
                alt="Instagram"
                width={36}
                height={36}
                title="Instagram"
              />
              <Image src="/logos/slack.svg" alt="Slack" width={36} height={36} title="Slack" />
              <Image src="/logos/notion.svg" alt="Notion" width={36} height={36} title="Notion" />
              <Link href="/product" className="integration-logo--more" title="See all integrations">
                <span>+</span>
              </Link>
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
        <div className="hero-actions hero-actions--buttonless justify-center" data-reveal>
          <a href={`${DASHBOARD_URL}/sign-in`} className="hero-action-primary">
            <span>Start now</span>
            <ArrowRight size={18} />
          </a>
          <Link href="/pricing" className="hero-action-secondary">
            <span>View pricing</span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
