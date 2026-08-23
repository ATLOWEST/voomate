const INDUSTRIES = [
  {
    name: 'E-commerce & D2C',
    role: 'Handles product discovery, cart assistance, and post-purchase support at scale.',
    metric: 'Up to 72% fewer support tickets',
    icon: '🛍️',
  },
  {
    name: 'Healthcare & Clinics',
    role: "Books appointments, answers FAQs on services, and routes urgent queries — in the patient's language.",
    metric: '3× faster appointment scheduling',
    icon: '🏥',
  },
  {
    name: 'Education & EdTech',
    role: 'Guides prospective students through courses, fees, and admissions. Available in regional languages.',
    metric: '40% lift in enquiry-to-enrolment rate',
    icon: '🎓',
  },
  {
    name: 'Real Estate',
    role: 'Qualifies leads, books site visits, and explains property details without a sales call.',
    metric: '60% more qualified leads captured',
    icon: '🏠',
  },
  {
    name: 'SaaS & Tech',
    role: 'Answers product questions, walks users through onboarding, and handles tier-1 support — fully automated.',
    metric: '80% of tier-1 tickets resolved without a human',
    icon: '💻',
  },
  {
    name: 'Financial Services',
    role: 'Explains products clearly, collects KYC intent, and routes complex cases to the right advisor.',
    metric: 'Compliant, always. Available 24/7.',
    icon: '🏦',
  },
  {
    name: 'Travel & Hospitality',
    role: "Handles booking queries, itinerary questions, and upsell conversations in the traveller's language.",
    metric: '2× upsell conversion via conversational AI',
    icon: '✈️',
  },
  {
    name: 'Food & Delivery',
    role: 'Takes orders, answers menu questions, and handles delivery status — over voice and chat.',
    metric: 'Zero missed orders during peak hours',
    icon: '🍔',
  },
  {
    name: 'Retail & Offline Stores',
    role: 'Extends your store online with an AI agent that knows your inventory, prices, and availability.',
    metric: '24/7 availability without extra staff',
    icon: '🏪',
  },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="py-24 bg-[#FFF8F0] scroll-mt-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-14">
          <p className="section-label mb-3">Built for your business</p>
          <h2 className="section-title max-w-2xl">Proven across 9 industries.</h2>
          <p className="section-subtitle mt-4 max-w-xl">
            Voomate isn't a one-size-fits-all chatbot. It adapts to your industry's vocabulary,
            compliance requirements, and customer expectations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {INDUSTRIES.map(({ name, role, metric, icon }) => (
            <article
              key={name}
              className="card industry-card rounded-2xl p-6 group overflow-hidden relative"
            >
              <div className="industry-bar absolute top-0 left-0 right-0" />
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl leading-none">{icon}</span>
                <h3 className="text-[1rem] font-bold text-[#1A1510] tracking-[-0.02em]">{name}</h3>
              </div>
              <p className="text-[13.5px] text-[#5A4D40] leading-relaxed mb-4">{role}</p>
              <p className="text-[12px] font-bold text-[#E8590C] tracking-wide">{metric}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
