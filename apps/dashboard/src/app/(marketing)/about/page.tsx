import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/json-ld';
import { siteUrl } from '@/lib/site-url';
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  DatabaseZap,
  Fingerprint,
  MessageSquareText,
  Mic2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';


export const metadata: Metadata = {
  title: 'About — The Voomate Principles',
  description:
    'Why Voomate is building one connected AI operating team for businesses. Discover our principles: grounded answers, useful actions, and private context.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'About — The Voomate Principles',
    description: 'Building one connected AI operating team for businesses.',
    url: siteUrl('/about'),
    siteName: 'Voomate',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About — The Voomate Principles',
    description: 'Building one connected AI operating team for businesses.',
  },
  alternates: {
    canonical: '/about',
  },
};

const PRINCIPLES = [
  {
    signal: 'Grounded',
    title: 'Honesty over confident guessing.',
    body: 'Answers should come from approved business knowledge or connected data. When the system cannot support an answer, it should say so and preserve a clear path to a person.',
    Icon: MessageSquareText,
  },
  {
    signal: 'Useful',
    title: 'Useful means finishing the work.',
    body: 'A customer often needs more than a sentence. Voomate is designed to move from conversation to an approved action through a controlled business tool.',
    Icon: Workflow,
  },
  {
    signal: 'Private',
    title: 'Private context stays private.',
    body: 'Tenant identity is resolved on the backend, database access remains tenant-scoped, and private tool fields do not become customer-facing model context.',
    Icon: Fingerprint,
  },
  {
    signal: 'Natural',
    title: 'A natural conversation earns trust.',
    body: 'Good voice and chat experiences are concise, context-aware, and easy to interrupt. The interface should feel responsive without pretending the system knows more than it does.',
    Icon: Mic2,
  },
];

const STACK = [
  { label: 'Reasoning', value: 'Amazon Nova through AWS Bedrock', Icon: Braces },
  { label: 'Knowledge', value: 'Tenant-scoped retrieval with pgvector', Icon: DatabaseZap },
  { label: 'Actions', value: 'Validated server-side execution tools', Icon: Workflow },
  { label: 'Voice', value: 'AWS streaming speech services', Icon: Mic2 },
  { label: 'Isolation', value: 'Scoped keys and database policy enforcement', Icon: ShieldCheck },
];

export default function AboutPage() {
  return (
    <main className="marketing-main subpage overflow-x-hidden w-full max-w-full">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'About', href: '/about' },
        ]}
      />
      <WebPageJsonLd
        name="About — The Voomate Principles"
        description="Why Voomate is building one connected AI operating team for businesses."
        url="/about"
      />
      <section className="subpage-hero subpage-hero--about" aria-labelledby="about-title">
        <div className="subpage-hero__aside" data-reveal>
          A small-business operation should not stop when the team is busy
        </div>
        <h1 id="about-title" data-scrub>
          Every business deserves
          <br />
          an always-available team.
        </h1>
        <p data-reveal>
          Voomate began with a simple gap: smaller businesses carry the same customer expectations
          as much larger companies, without the same headcount or connected software operation.
        </p>
      </section>

      <section className="about-manifesto" aria-labelledby="manifesto-title">
        <div className="manifesto-number" aria-hidden="true">
          One team
        </div>
        <div>
          <p className="editorial-index">Why exactly three agents</p>
          <h2 id="manifesto-title" data-scrub>
            Conversation, voice, and action belong together.
          </h2>
          <p data-reveal>
            The Web Agent serves the website. The Voice Calling Agent handles natural spoken
            conversations. The Integration Agent connects permitted business systems. Together they
            share knowledge and context instead of creating three disconnected customer experiences.
          </p>
        </div>
      </section>

      <section className="principles-section" aria-labelledby="principles-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">How we build</p>
            <h2 id="principles-title" data-scrub>
              Restraint is part
              <br />
              of the product.
            </h2>
          </div>
          <p data-reveal>
            Every principle is meant to keep the system more useful in real customer situations, not
            simply more impressive in a demo.
          </p>
        </div>
        <div className="principles-grid">
          {PRINCIPLES.map(({ signal, title, body, Icon }) => (
            <article key={signal} data-reveal>
              <div>
                <span>{signal}</span>
                <Icon size={22} strokeWidth={1.55} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stack-section" data-stack-section aria-labelledby="stack-title">
        <div>
          <p className="editorial-index">Under the surface</p>
          <h2 id="stack-title" data-scrub>
            An AWS-native brain.
            <br />A controlled data path.
          </h2>
          <p data-reveal>
            Model credentials and business integrations remain behind the backend. The public widget
            receives only the session and response data required for the customer experience.
          </p>
        </div>
        <div className="stack-list" data-reveal>
          {STACK.map(({ label, value, Icon }) => (
            <div key={label} data-stack-card>
              <Icon size={18} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="subpage-cta">
        <h2 data-scrub>
          Build the operation
          <br />
          you want customers to feel.
        </h2>
        <div className="hero-actions--buttonless justify-center" data-reveal>
          <Link href="/sign-up" className="hero-action-primary">
            <span>Start now</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/pricing" className="hero-action-secondary">
            <span>Review pricing tiers</span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
