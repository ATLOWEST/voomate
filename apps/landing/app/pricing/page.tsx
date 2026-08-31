import type { Metadata } from 'next';
import { FaqPageJsonLd, BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/json-ld';
import { siteUrl } from '@/lib/site-url';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ChevronDown, ShieldCheck } from 'lucide-react';

import { PricingGrid } from '@/components/pricing/pricing-grid';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://app.atlowest.in';

export const metadata: Metadata = {
  title: 'Pricing — Voomate Plans',
  description:
    'Clear Voomate plans: pay as you go from ₹0, Pro at ₹10,000/month, Max at ₹20,000/month, and tailored custom plans.',
  openGraph: {
    title: 'Pricing — Voomate Plans',
    description: 'Pay as you go from ₹0. Pro is ₹10,000/month and Max is ₹20,000/month.',
    url: siteUrl('/pricing'),
    siteName: 'Voomate',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Voomate Plans',
    description: 'Pay as you go from ₹0. Pro is ₹10,000/month and Max is ₹20,000/month.',
  },
  alternates: {
    canonical: '/pricing',
  },
};

const FAQ = [
  {
    q: 'What counts as a conversation?',
    a: 'A conversation is one customer session, from the first message until the session becomes inactive. The messages inside that session stay together as one thread.',
  },
  {
    q: 'Are the three agents separate products?',
    a: 'No. The Web Agent, Voice Calling Agent, and Integration Agent are the fixed parts of one Voomate system. Your plan controls usage and connected capabilities, not a menu of unrelated bots.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can begin with a small workflow and move to a higher-volume plan as more customer conversations and integrations are added.',
  },
  {
    q: 'Does Voomate charge for unanswered questions?',
    a: 'Usage is tracked by conversation and by the AWS services involved. The dashboard is designed to expose that usage so a business can monitor how the agent is being used.',
  },
  {
    q: 'Can we connect a custom backend?',
    a: 'Yes. The Integration Agent can use an approved server-side adapter or the Voomate Connect SDK. Credentials remain in trusted backend environments rather than the public widget.',
  },
];

export default function PricingPage() {
  return (
    <main className="marketing-main subpage overflow-x-hidden w-full max-w-full">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Pricing', href: '/pricing' },
        ]}
      />
      <WebPageJsonLd
        name="Pricing — Voomate Plans"
        description="Clear Voomate plans for businesses starting, growing, or connecting custom systems."
        url="/pricing"
      />
      <FaqPageJsonLd faqs={FAQ} />
      <section
        className="pt-32 pb-24 md:pt-48 md:pb-32 flex flex-col items-center justify-center text-center px-4"
        aria-labelledby="pricing-title"
      >
        <h1
          id="pricing-title"
          className="max-w-5xl text-balance text-[clamp(3rem,5vw,5.5rem)] font-medium tracking-tight leading-[1.05]"
          data-scrub
        >
          Clear pricing for a connected AI team.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-500" data-reveal>
          Start with the workflow you need now. Add volume, languages, and connected actions as your
          customer operation grows.
        </p>
      </section>

      <section className="px-4 pb-32 md:pb-48" aria-label="Voomate plans">
        <PricingGrid />
      </section>

      <section className="included-section" aria-labelledby="included-title">
        <div className="included-section__copy">
          <ShieldCheck size={28} />
          <h2 id="included-title" data-scrub>
            The safety model is not an add-on.
          </h2>
          <p data-reveal>
            Every plan keeps model credentials server-side, resolves tenants from scoped keys, and
            filters tool results before anything becomes a customer-facing answer.
          </p>
        </div>
        <div className="included-section__rail" data-reveal>
          <span>Tenant-scoped data</span>
          <i />
          <span>Controlled tools</span>
          <i />
          <span>Usage visibility</span>
        </div>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="editorial-index">Before you start</p>
            <h2 id="faq-title" data-scrub>
              Questions,
              <br />
              answered plainly.
            </h2>
          </div>
          <p data-reveal>
            Details that should be clear before you put an agent in front of a customer.
          </p>
        </div>
        <div className="faq-list" data-reveal>
          {FAQ.map(({ q, a }, index) => (
            <details key={q} open={index === 0}>
              <summary>
                {q}
                <ChevronDown size={19} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="subpage-cta">
        <h2 data-scrub>
          Start small.
          <br />
          Keep the system connected.
        </h2>
        <div className="hero-actions--buttonless justify-center" data-reveal>
          <a href={`${DASHBOARD_URL}/sign-up`} className="hero-action-primary">
            <span>Create workspace</span>
            <ArrowRight size={18} />
          </a>
          <Link href="/about" className="hero-action-secondary">
            <span>How Voomate is built</span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
