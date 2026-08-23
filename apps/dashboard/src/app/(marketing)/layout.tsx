import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing-layout/navbar';
import { Footer } from '@/components/landing-layout/footer';
import { MarketingMotion } from '@/components/ui/marketing-motion';
import { ShaderBackground } from '@/components/ui/shader-bg';
import { OrganizationJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="paper-grain relative min-h-screen text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="site-background" aria-hidden="true">
        <ShaderBackground className="h-full w-full" />
      </div>
      <div className="site-aurora" aria-hidden="true" />
      <MarketingMotion />
      <OrganizationJsonLd />
      <Navbar />
      <div className="site-content" id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer />
    </div>
  );
}
