import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ShieldCheck } from 'lucide-react';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Clear Voomate plans for businesses starting, growing, or connecting custom systems.',
};

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    tagline: 'For a small team proving the workflow.',
    cta: 'Start free',
    href: `${DASHBOARD_URL}/sign-in`,
    popular: false,
    features: [
      '100 conversations each month',
      'One three-agent workspace',
      'Website chat and voice entry points',
      'Grounded knowledge answers',
      'Community support',
    ],
  },
  {
    name: 'Growth',
    price: '₹2,499',
    period: '/ month',
    tagline: 'For a business ready to connect real work.',
    cta: 'Start a 14-day trial',
    href: `${DASHBOARD_URL}/sign-in?plan=growth`,
    popular: true,
    features: [
      '5,000 conversations each month',
      'Web, Voice Calling, and Integration Agents',
      'Multilingual conversations',
      'Approved action tools and live data',
      'Usage and gap reporting',
      'Store and business-system adapters',
      'Custom widget branding',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    tagline: 'For multiple teams and deeper system access.',
    cta: 'Talk to the team',
    href: 'mailto:hello@voomate.com?subject=Voomate%20Enterprise',
    popular: false,
    features: [
      'Custom conversation volume',
      'Multiple tenant-scoped workspaces',
      'Dedicated onboarding support',
      'Custom ERP, CRM, and OMS adapters',
      'Security and compliance review support',
      'Priority support channels',
    ],
  },
];

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
    <main className="marketing-main subpage">
      <section className="subpage-hero subpage-hero--center" aria-labelledby="pricing-title">
        <div className="subpage-hero__aside" data-reveal>
          Plans that grow with the work
        </div>
        <h1 id="pricing-title" data-scrub>
          Clear pricing for
          <br />a connected AI team.
        </h1>
        <p data-reveal>
          Start with the workflow you need now. Add volume, languages, and connected actions as your
          customer operation grows.
        </p>
      </section>

      <section className="pricing-section" aria-label="Voomate plans">
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article
              className="pricing-card"
              data-featured={plan.popular}
              data-reveal
              key={plan.name}
            >
              <div className="pricing-card__topline">
                <span>{plan.name}</span>
                {plan.popular ? <strong>Recommended</strong> : null}
              </div>
              <h2>{plan.name}</h2>
              <p className="pricing-card__tagline">{plan.tagline}</p>
              <div className="pricing-card__price">
                <strong>{plan.price}</strong>
                {plan.period ? <span>{plan.period}</span> : null}
              </div>
              <a href={plan.href} className={plan.popular ? 'btn-ember' : 'btn-quiet'}>
                {plan.cta} <ArrowRight size={16} />
              </a>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
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
        <div data-reveal>
          <a href={`${DASHBOARD_URL}/sign-in`} className="btn-ember">
            Start building <ArrowRight size={16} />
          </a>
          <Link href="/about" className="btn-quiet">
            How Voomate is built
          </Link>
        </div>
      </section>
    </main>
  );
}
