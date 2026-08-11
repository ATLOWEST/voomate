import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Pricing — Voomate',
  description:
    'Simple, transparent pricing for AI-powered customer support automation. Start free, scale as you grow.',
};

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    tagline: 'For builders and small stores getting started.',
    cta: 'Start free →',
    href: '/signup',
    popular: false,
    features: [
      '100 conversations / month',
      '1 voice + 1 chat agent',
      'English language only',
      'Basic product Q&A',
      'Community support',
    ],
    notIncluded: [
      'Multilingual support',
      'Order automation',
      'Analytics dashboard',
      'Custom branding removal',
    ],
  },
  {
    name: 'Growth',
    price: '₹2,499',
    period: '/ month',
    tagline: 'For growing D2C and e-commerce stores.',
    cta: 'Start 14-day trial →',
    href: '/signup?plan=growth',
    popular: true,
    features: [
      '5,000 conversations / month',
      'Unlimited agents',
      '30+ languages, auto-detected',
      'Full order + return automation',
      'Analytics & gap reports',
      'Shopify / WooCommerce integration',
      'Custom branding',
      'Email support (48h SLA)',
    ],
    notIncluded: ['Priority SLA', 'Dedicated onboarding'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    tagline: 'For large merchants, platforms, and agencies.',
    cta: 'Talk to sales →',
    href: '/contact',
    popular: false,
    features: [
      'Unlimited conversations',
      'Custom LLM fine-tuning',
      'Multi-store / multi-brand support',
      'SLA-backed uptime guarantee',
      'Dedicated onboarding engineer',
      'Custom integrations (ERP, CRM, OMS)',
      'GDPR / SOC2 compliance reports',
      'Phone & Slack support',
    ],
    notIncluded: [],
  },
];

const FAQ = [
  {
    q: 'What counts as a conversation?',
    a: 'One conversation is a single session — from the first message to the last, regardless of how many exchanges happen inside it. A session ends after 30 minutes of inactivity.',
  },
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes. Upgrade takes effect immediately; downgrades apply at the next billing cycle. No penalties.',
  },
  {
    q: 'What happens when I hit my conversation limit?',
    a: "On the free plan, the agent pauses until the next month. On paid plans, overage conversations are charged at ₹0.40 each — you'll get a warning email at 80% usage.",
  },
  {
    q: 'Is there a setup fee?',
    a: 'No. Starter is always free. Growth and Enterprise are billed monthly or annually (20% discount on annual). No setup fees, no hidden charges.',
  },
  {
    q: 'Do you support WhatsApp and Instagram DMs?',
    a: 'Yes — on Growth and above, Voomate can be connected to WhatsApp Business API and Instagram Messaging via our integration partners.',
  },
];

export default function PricingPage() {
  return (
    <div className="paper-grain">
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="section-label mb-3">Pricing</p>
            <h1 className="section-title mb-4">Simple pricing. No surprises.</h1>
            <p className="section-subtitle max-w-lg mx-auto">
              Start free. Scale when your store does. Every plan includes voice, chat, and
              multilingual support — the only difference is volume.
            </p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 border flex flex-col ${
                  plan.popular
                    ? 'pricing-popular border-[#FFCB99] shadow-[0_4px_32px_rgba(232,89,12,0.12)]'
                    : 'bg-white border-[#EDE0CE] shadow-[0_1px_4px_rgba(26,21,16,0.06)]'
                }`}
              >
                {plan.popular && <div className="badge-ember mb-4 self-start">Most popular</div>}
                <p className="text-[12px] font-bold uppercase tracking-widest text-[#9A8B7A] mb-1">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="text-[2.25rem] font-extrabold tracking-tight text-[#1A1510]"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-[14px] text-[#9A8B7A]">{plan.period}</span>}
                </div>
                <p className="text-[13.5px] text-[#5A4D40] mb-6">{plan.tagline}</p>

                <Link
                  href={plan.href}
                  className={
                    plan.popular
                      ? 'btn-ember mb-6 justify-center text-sm'
                      : 'btn-outline mb-6 justify-center text-sm'
                  }
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-[#1A1510]">
                      <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0 mt-0.5">
                        <circle cx="10" cy="10" r="9" fill="#E8590C" opacity="0.12" />
                        <path
                          d="M6 10.4l2.7 2.8L14 7.6"
                          stroke="#E8590C"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13.5px] text-[#9A8B7A] line-through"
                    >
                      <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0 mt-0.5">
                        <circle cx="10" cy="10" r="9" fill="#9A8B7A" opacity="0.08" />
                        <path
                          d="M7 13L13 7M7 7l6 6"
                          stroke="#9A8B7A"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="section-title text-center mb-10">Questions, answered plainly.</h2>
            <div className="space-y-4">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="card rounded-2xl p-6">
                  <h3 className="text-[1rem] font-bold text-[#1A1510] mb-2">{q}</h3>
                  <p className="text-[13.5px] text-[#5A4D40] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
