'use client';
import { motion } from 'framer-motion';

const ROW1 = [
  {
    quote:
      'Setup took 11 minutes. By morning it had handled 47 order-tracking queries without a single ticket reaching my inbox.',
    author: 'Ankit Sharma',
    role: 'Founder · Boldfit',
    metric: '11 min',
    metricLabel: 'To full deployment',
    initials: 'AS',
  },
  {
    quote:
      "We replaced our entire Tier-1 support team over 6 months. FCR went from 34% to 81%. Hinglish support converted customers our old tool couldn't even understand.",
    author: 'Priya Mehta',
    role: 'Head of CX · Meesho',
    metric: '81%',
    metricLabel: 'First-contact resolution',
    initials: 'PM',
  },
  {
    quote:
      "The no-hallucination guarantee is what convinced me. It only answers from our docs. When it doesn't know, it routes to us — that's exactly what support should do.",
    author: 'Camille Dubois',
    role: 'VP Product · Alan',
    metric: '0',
    metricLabel: 'Hallucinations in 90 days',
    initials: 'CD',
  },
  {
    quote:
      "Our customers speak six languages across three countries. I didn't configure anything for multilingual — Voomate detected Swahili in week one on its own.",
    author: 'James Ochieng',
    role: 'Co-founder · Twiga Foods',
    metric: '6',
    metricLabel: 'Languages auto-detected',
    initials: 'JO',
  },
];

const ROW2 = [
  {
    quote:
      'Customers thought they were talking to a human for the first two weeks. The voice quality and response time are that good.',
    author: 'Sara Nair',
    role: 'Ops Lead · Licious',
    metric: '1.3s',
    metricLabel: 'Average voice response',
    initials: 'SN',
  },
  {
    quote:
      'We run 3 Shopify stores across two regions. Voomate syncs inventory and order data across all of them with zero lag.',
    author: 'Rajan Verma',
    role: 'CEO · WrapCart',
    metric: '3',
    metricLabel: 'Stores, one agent',
    initials: 'RV',
  },
  {
    quote:
      'Ticket volume dropped 72% in week one. My support team now handles escalations only — complex, high-value conversations. Morale is better.',
    author: 'Meera Iyer',
    role: 'Director of Support · Nykaa',
    metric: '72%',
    metricLabel: 'Fewer support tickets',
    initials: 'MI',
  },
  {
    quote:
      "We tested 7 AI tools. This is the only one that doesn't hallucinate product details or confuse variants. That alone made the decision.",
    author: 'David Osei',
    role: 'Head of Growth · Jumia',
    metric: '7',
    metricLabel: 'Tools tried, 1 chosen',
    initials: 'DO',
  },
];

function Card({ item }: { item: (typeof ROW1)[0] }) {
  return (
    <div className="w-[340px] shrink-0 bg-white border border-[#EAD9C4] rounded-2xl p-6 shadow-[0_2px_12px_rgba(28,20,16,0.06)] flex flex-col gap-4">
      {/* Large warm quote mark */}
      <div
        className="text-[3.5rem] leading-none font-black text-[#F2E5D0] select-none -mb-4 -mt-1"
        aria-hidden
      >
        &ldquo;
      </div>
      <p className="text-[13.5px] text-[#1C1410] leading-relaxed flex-1">{item.quote}</p>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F2E5D0]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8590C, #A33A07)' }}
          >
            {item.initials}
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1C1410] leading-none">{item.author}</p>
            <p className="text-[10.5px] text-[#8C7B6B] mt-0.5">{item.role}</p>
          </div>
        </div>
        <div className="bg-[#FFF4EC] border border-[#FFE5CC] rounded-xl px-3 py-2 text-right shrink-0">
          <p
            className="text-[1.1rem] font-extrabold text-[#E8590C] tracking-tight leading-none"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {item.metric}
          </p>
          <p className="text-[9px] text-[#8C7B6B] mt-0.5 leading-tight max-w-[80px]">
            {item.metricLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ items, reverse = false }: { items: typeof ROW1; reverse?: boolean }) {
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <motion.div
        className="flex gap-4"
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <Card key={i} item={item} />
        ))}
      </motion.div>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-14">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <h2 className="section-title">
              Real results.
              <br />
              No fluff.
            </h2>
          </div>
          <div className="flex items-center gap-8">
            {[
              { n: '4.9 / 5', l: 'Avg. rating' },
              { n: '2,400+', l: 'Storefronts' },
              { n: '60%', l: 'Cost reduction' },
            ].map(({ n, l }) => (
              <div key={l} className="text-right">
                <p className="stat-num">{n}</p>
                <p className="stat-label mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <MarqueeRow items={ROW1} />
        <MarqueeRow items={ROW2} reverse />
      </div>
    </section>
  );
}
