const STEPS = [
  {
    n: '01',
    title: 'Connect your store',
    body: 'Paste one script tag or install the Shopify app. Voomate links to your product catalog, order system, and return policies in under 5 minutes.',
    detail: 'Shopify · WooCommerce · Custom API',
  },
  {
    n: '02',
    title: 'Voomate learns your business',
    body: "It crawls every page, embeds your knowledge, and learns your brand's tone. No manual training, no prompt engineering — it reads what you've already written.",
    detail: 'Catalog · Policies · FAQs · Tone',
  },
  {
    n: '03',
    title: 'Customers talk. It handles everything.',
    body: "From the first question to the completed order, Voomate handles the full conversation in the customer's language — voice or chat, 24 hours a day.",
    detail: 'Voice · Chat · 30+ Languages · 24/7',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-white border-y border-[#EDE0CE]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-14">
          <p className="section-label mb-3">Setup in minutes</p>
          <h2 className="section-title max-w-2xl">Three steps to a fully staffed storefront.</h2>
          <p className="section-subtitle mt-4 max-w-lg">
            No AI expertise needed. No training data to write. Your existing website is the setup.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector lines (desktop) */}
          <div className="hidden md:block absolute top-9 left-[33%] right-[33%] h-px bg-[#EDE0CE] z-0" />

          {STEPS.map(({ n, title, body, detail }) => (
            <div key={n} className="relative z-10 card rounded-2xl p-7">
              <div className="step-number mb-5">{n}</div>
              <h3 className="text-[1rem] font-bold text-[#1A1510] mb-3 tracking-[-0.02em]">
                {title}
              </h3>
              <p className="text-[13.5px] text-[#5A4D40] leading-relaxed mb-4">{body}</p>
              <p className="text-[11.5px] font-semibold text-[#E8590C] tracking-wide">{detail}</p>
            </div>
          ))}
        </div>

        {/* Code snippet teaser */}
        <div className="mt-10 mx-auto max-w-lg">
          <div className="bg-[#1A1510] rounded-2xl px-6 py-5 font-mono text-[13px] text-[#9A8B7A]">
            <span className="text-[#9A8B7A]">
              {`<!-- Add to your site's `}
              <span className="text-[#FFE4CC]">{`<head>`}</span>
              {` -->`}
            </span>
            <br />
            <span className="text-[#E8590C]">{'<script'}</span>
            <span className="text-[#FFE4CC]">{' src'}</span>
            <span className="text-[#9A8B7A]">{'='}</span>
            <span className="text-[#FFCB99]">{'"https://cdn.voomate.ai/widget.js"'}</span>
            <br />
            {'        '}
            <span className="text-[#FFE4CC]">{'data-key'}</span>
            <span className="text-[#9A8B7A]">{'='}</span>
            <span className="text-[#FFCB99]">{'"your-api-key"'}</span>
            <span className="text-[#E8590C]">{'></script>'}</span>
          </div>
          <p className="text-center text-[12px] text-[#9A8B7A] mt-3">
            That's it. One tag. No backend changes.
          </p>
        </div>
      </div>
    </section>
  );
}
