const PLATFORMS = [
  { name: 'Shopify', category: 'Commerce' },
  { name: 'WooCommerce', category: 'Commerce' },
  { name: 'Magento', category: 'Commerce' },
  { name: 'BigCommerce', category: 'Commerce' },
  { name: 'Salesforce', category: 'CRM' },
  { name: 'HubSpot', category: 'CRM' },
  { name: 'Zendesk', category: 'Support' },
  { name: 'Intercom', category: 'Support' },
  { name: 'Freshdesk', category: 'Support' },
  { name: 'WhatsApp', category: 'Comms' },
  { name: 'Twilio', category: 'Comms' },
  { name: 'Razorpay', category: 'Payments' },
  { name: 'Stripe', category: 'Payments' },
];

// All category labels use ember shades — no cool colors
const CATEGORY_SHADE: Record<string, string> = {
  Commerce: '#E8590C',
  CRM: '#C94A09',
  Support: '#A33A07',
  Comms: '#FF7A1A',
  Payments: '#5C4A38',
};

export function IntegrationsSection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="section-label mb-4"></p>
          <h2 className="section-title max-w-lg mx-auto">
            One line of code.
            <br />
            Live in 5 minutes.
          </h2>
          <p className="section-subtitle max-w-sm mx-auto mt-4">
            Connects to your existing stack without an integration project.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — categorised platforms */}
          <div className="space-y-7">
            {(['Commerce', 'CRM', 'Support', 'Comms', 'Payments'] as const).map((cat) => (
              <div key={cat}>
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 block"
                  style={{ color: CATEGORY_SHADE[cat] }}
                >
                  {cat}
                </span>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.filter((p) => p.category === cat).map((p) => (
                    <div
                      key={p.name}
                      className="px-4 py-2 rounded-xl bg-white border border-[#EAD9C4] text-[13px] font-semibold text-[#1C1410] shadow-[0_1px_4px_rgba(28,20,16,0.05)] hover:border-[#E8590C]/40 hover:shadow-[0_2px_12px_rgba(232,89,12,0.10)] transition-all cursor-default"
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right — code + steps */}
          <div className="space-y-5">
            {/* Terminal */}
            <div
              className="rounded-2xl overflow-hidden border border-[#2A1F18] shadow-[0_8px_32px_rgba(28,20,16,0.18)]"
              style={{ background: '#1C1410' }}
            >
              {/* Traffic lights */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2A1F18]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                <span className="ml-3 text-[11px] text-[#5C4A38] font-mono">index.html</span>
              </div>
              <pre className="px-5 py-5 text-[13px] font-mono leading-relaxed overflow-x-auto">
                <code>
                  <span className="text-[#5C4A38]">{'<!-- Add to your site -->\n'}</span>
                  <span className="text-[#FFA85C]">{'<script '}</span>
                  <span className="text-[#FFCB99]">{'src'}</span>
                  <span className="text-[#F2E5D0]">{'='}</span>
                  <span className="text-[#E8590C]">{'"https://cdn.voomate.ai/agent.js"'}</span>
                  <span className="text-[#F2E5D0]">{'\n  '}</span>
                  <span className="text-[#FFCB99]">{'data-store'}</span>
                  <span className="text-[#F2E5D0]">{'='}</span>
                  <span className="text-[#E8590C]">{'"your-store-id"'}</span>
                  <span className="text-[#F2E5D0]">{'\n  '}</span>
                  <span className="text-[#FFCB99]">{'data-lang'}</span>
                  <span className="text-[#F2E5D0]">{'='}</span>
                  <span className="text-[#E8590C]">{'"auto"'}</span>
                  <span className="text-[#F2E5D0]">{'\n  '}</span>
                  <span className="text-[#FFCB99]">{'async'}</span>
                  <span className="text-[#FFA85C]">{'>'}</span>
                  <span className="text-[#FFA85C]">{'</script>'}</span>
                </code>
              </pre>
              {/* Warm amber "live" badge — no green */}
              <div className="px-5 pb-4">
                <div className="inline-flex items-center gap-2 bg-[#E8590C]/15 border border-[#E8590C]/30 rounded-lg px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8590C] animate-pulse" />
                  <span className="text-[#FFA85C] text-[11px] font-bold">Agent is live.</span>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {[
                {
                  n: '1',
                  label: 'Paste the script tag',
                  sub: "One line inside your site's <head>.",
                },
                {
                  n: '2',
                  label: 'Connect your store',
                  sub: 'Voomate crawls your catalog automatically.',
                },
                { n: '3', label: "You're live", sub: 'Agent handles queries within 5 minutes.' },
              ].map((s) => (
                <div
                  key={s.n}
                  className="flex items-center gap-4 bg-white border border-[#EAD9C4] rounded-xl px-4 py-3.5 shadow-[0_1px_4px_rgba(28,20,16,0.04)]"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #E8590C, #A33A07)' }}
                  >
                    <span className="text-white text-[12px] font-black">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1C1410]">{s.label}</p>
                    <p className="text-[11px] text-[#8C7B6B] mt-0.5">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
