import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/sections/hero';
import { FeaturesSection } from '@/components/sections/features';
import { LifecycleSection } from '@/components/sections/lifecycle';
import { BusinessOSSection } from '@/components/sections/business-os';
import { IndustriesSlideshow } from '@/components/sections/industries-slideshow';
import { IntegrationsSection } from '@/components/sections/integrations';
import { TestimonialsSection } from '@/components/sections/testimonials';
import { CTASection } from '@/components/sections/cta-banner';
import { ShaderBackground } from '@/components/ui/shader-bg';

export const metadata: Metadata = {
  title: 'Voomate — AI Virtual Shopkeeper for Merchants',
  description:
    'Deploy an AI virtual shopkeeper on your storefront in 5 minutes. Handles every customer conversation — product queries, order tracking, returns, and upselling — across voice, chat, and 30+ languages.',
  keywords: [
    'AI voice agent',
    'AI chatbot for ecommerce',
    'virtual shopkeeper',
    'multilingual customer support',
    'Shopify AI agent',
    'AI customer support automation',
  ],
  openGraph: {
    type: 'website',
    title: 'Voomate — AI Virtual Shopkeeper for Merchants',
    description:
      'One line of code. AI handles every customer conversation, 24/7, in 30+ languages.',
    siteName: 'Voomate',
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-[-1]" style={{ opacity: 0.8 }}>
        <ShaderBackground className="h-full w-full" />
      </div>
      <Navbar />
      <main>
        {/* S1 — Hero + Trusted-by strip */}
        {/* bg: warm white #FFFDF9 */}
        <HeroSection />

        {/* S2 — What can it do? (Features / Vertical tabs) */}
        {/* bg: white — contrast from hero */}
        <FeaturesSection />

        {/* S3 — How does it work? (AI Pipeline) */}
        {/* bg: warm cream #F7EFE3 */}
        <BusinessOSSection />
        <LifecycleSection />

        {/* S4 — Does it work for MY industry? */}
        {/* bg: warm cream #F7EFE3 — same as lifecycle, no divider needed */}
        <IndustriesSlideshow />

        {/* S5 — How hard is setup? */}
        {/* bg: warm white #FFFDF9 */}
        <IntegrationsSection />

        {/* S6 — Does it actually work? */}
        {/* bg: white */}
        <TestimonialsSection />

        {/* S7 — Ready. Deploy. */}
        {/* bg: warm cream #F7EFE3 */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
