import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Industries — Voomate',
  description:
    "Voomate's AI virtual shopkeeper adapts to your industry — E-commerce, Healthcare, Education, Real Estate, SaaS, Financial Services, Travel, Food & Delivery, Retail.",
};

const INDUSTRIES = [
  {
    icon: '🛍️',
    name: 'E-commerce & D2C Brands',
    headline: 'Handle 80% of support without a ticket.',
    body: 'Product questions, size guides, stock availability, order tracking, return initiations — Voomate handles every routine customer query the moment it comes in. Your support team sees only the edge cases that genuinely need a human.',
    useCases: [
      'Product discovery & recommendations',
      'Real-time stock availability',
      'Order status & tracking',
      'Return & exchange initiation',
      'Discount code validation',
    ],
    metric: { n: '72%', l: 'reduction in support tickets for D2C brands' },
  },
  {
    icon: '🏥',
    name: 'Healthcare & Clinics',
    headline: 'Patients get answers. Staff stay free to care.',
    body: "Voomate answers clinic FAQs, explains services and fees, and books appointments — in the patient's language. Urgent queries are flagged and routed immediately. Fully HIPAA-aware response guardrails included.",
    useCases: [
      'Appointment booking & rescheduling',
      'Service and fee inquiries',
      'Insurance & coverage questions',
      'Pre-visit instructions',
      'Language-native patient communication',
    ],
    metric: { n: '3×', l: 'faster appointment booking rate' },
  },
  {
    icon: '🎓',
    name: 'Education & EdTech',
    headline: 'Convert more enquiries — in every language.',
    body: 'Prospective students have questions at 11pm. Voomate answers them — course details, fees, admission timelines, scholarship eligibility — in Hindi, Tamil, Marathi, or whichever language the student is comfortable in.',
    useCases: [
      'Course and curriculum inquiries',
      'Fee structure and scholarship info',
      'Admission timeline guidance',
      'Entrance exam and eligibility',
      'Regional language support',
    ],
    metric: { n: '40%', l: 'lift in enquiry-to-enrolment conversion' },
  },
  {
    icon: '🏠',
    name: 'Real Estate',
    headline: 'Qualify leads while you sleep.',
    body: 'Most property enquiries happen outside business hours. Voomate captures, qualifies, and schedules site visits from every lead — whether they speak English, Hindi, or Tamil — before your competition picks up the phone.',
    useCases: [
      'Property details & pricing',
      'Site visit scheduling',
      'Lead qualification',
      'Locality & amenity questions',
      'Document checklist guidance',
    ],
    metric: { n: '60%', l: 'more qualified leads captured per month' },
  },
  {
    icon: '💻',
    name: 'SaaS & Tech Products',
    headline: 'Tier-1 support, fully automated.',
    body: 'Voomate reads your docs, changelogs, and help articles and becomes a first-line support agent that actually understands your product. 80% of tier-1 tickets resolved without a human touched.',
    useCases: [
      'Onboarding walkthrough',
      'Feature explanation & docs',
      'Bug triage & known issue routing',
      'Billing and plan queries',
      'Integration & API guidance',
    ],
    metric: { n: '80%', l: 'of tier-1 tickets resolved without a human' },
  },
  {
    icon: '🏦',
    name: 'Financial Services & BFSI',
    headline: 'Compliant answers. Human-free delivery.',
    body: 'Voomate explains loan products, insurance policies, and investment options clearly — without crossing compliance lines. Complex queries route to advisors with a clean conversation transcript included.',
    useCases: [
      'Product eligibility check',
      'EMI and interest calculator guidance',
      'KYC intent collection',
      'Policy terms explanation',
      'Advisor routing with context',
    ],
    metric: { n: '24/7', l: 'compliant availability with full audit trail' },
  },
  {
    icon: '✈️',
    name: 'Travel & Hospitality',
    headline: 'Convert travellers. Upsell experiences.',
    body: "Booking questions, itinerary details, cancellation policies, room upgrades — Voomate handles the full pre- and post-booking conversation in the traveller's language, and proactively upsells where relevant.",
    useCases: [
      'Booking queries & confirmation',
      'Itinerary and check-in details',
      'Cancellation & refund policy',
      'Upgrade and add-on upsell',
      'Destination and local tips',
    ],
    metric: { n: '2×', l: 'upsell conversion via conversational AI' },
  },
  {
    icon: '🍔',
    name: 'Food & Delivery',
    headline: 'Zero missed orders. Even at peak.',
    body: 'Voomate takes orders, answers menu questions, updates delivery status, and handles complaints — by voice or chat — without any queue during rush hour. Works with your existing delivery platform.',
    useCases: [
      'Menu and allergen queries',
      'Order placement via voice/chat',
      'Delivery ETA updates',
      'Complaint and refund handling',
      'Loyalty and offer information',
    ],
    metric: { n: '0', l: 'missed orders during peak hours' },
  },
  {
    icon: '🏪',
    name: 'Retail & Offline Stores',
    headline: 'Extend your store online — without extra staff.',
    body: 'You have a physical store and a website. Voomate bridges both — answering inventory questions, branch timings, and product availability queries online, any hour of the day.',
    useCases: [
      'Store hours & locations',
      'Product availability & pricing',
      'Pre-purchase advisory',
      'Click & collect guidance',
      'Loyalty scheme queries',
    ],
    metric: { n: '24/7', l: 'online availability without hiring' },
  },
];

export default function IndustriesPage() {
  return (
    <div className="paper-grain">
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="mb-16 max-w-3xl">
            <p className="section-label mb-3">Industries</p>
            <h1 className="section-title mb-4">
              Built for merchants.
              <br />
              Proven across industries.
            </h1>
            <p className="section-subtitle">
              Voomate adapts to your industry's vocabulary, compliance requirements, and customer
              expectations. One platform — nine proven verticals.
            </p>
          </div>

          {/* Industry cards — alternating layout */}
          <div className="space-y-8">
            {INDUSTRIES.map(({ icon, name, headline, body, useCases, metric }, i) => (
              <article
                key={name}
                className={`card rounded-3xl p-8 md:p-10 grid md:grid-cols-[1fr_300px] gap-8 ${
                  i % 2 === 1 ? 'md:grid-cols-[300px_1fr]' : ''
                }`}
              >
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl leading-none">{icon}</span>
                    <h2 className="text-[1.05rem] font-bold text-[#9A8B7A] tracking-wide">
                      {name}
                    </h2>
                  </div>
                  <h3 className="text-[1.35rem] font-bold text-[#1A1510] mb-3 tracking-[-0.025em]">
                    {headline}
                  </h3>
                  <p className="text-[14px] text-[#5A4D40] leading-relaxed mb-5">{body}</p>
                  <ul className="space-y-1.5">
                    {useCases.map((u) => (
                      <li key={u} className="flex items-center gap-2 text-[13px] text-[#5A4D40]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E8590C] shrink-0" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`flex flex-col justify-center ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div className="bg-[#FFF4ED] border border-[#FFE4CC] rounded-2xl p-6 text-center">
                    <p
                      className="text-[3rem] font-extrabold text-[#E8590C] leading-none tracking-tight mb-2"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {metric.n}
                    </p>
                    <p className="text-[13px] text-[#9A8B7A] leading-snug">{metric.l}</p>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001'}/sign-in`}
                    className="btn-ember mt-4 justify-center text-sm"
                  >
                    Build your AI team →
                  </a>
                </div>
              </article>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="section-subtitle mb-6">
              Don't see your industry? Voomate works for any business that handles customer
              conversations.
            </p>
            <Link href="/contact" className="btn-ember px-8 py-3.5 text-[1rem]">
              Talk to us →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
