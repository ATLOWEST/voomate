const INTEGRATIONS = [
  'Shopify',
  'WooCommerce',
  'Magento',
  'BigCommerce',
  'Salesforce',
  'HubSpot',
  'Zendesk',
  'Intercom',
  'Stripe',
  'Razorpay',
  'WhatsApp',
  'Twilio',
];

export function LogosSection() {
  return (
    <section className="py-14 border-y border-[#EDE0CE] bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center section-label mb-8">Works with your existing stack</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div
            className="flex gap-6 animate-marquee w-max"
            style={{ '--scroll-duration': '32s' } as React.CSSProperties}
          >
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <div
                key={i}
                className="flex items-center justify-center h-9 px-5 rounded-full bg-[#FAF5EE] border border-[#EDE0CE] whitespace-nowrap"
              >
                <span className="text-[13px] font-semibold text-[#5A4D40] tracking-wide">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
