import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist } from 'next/font/google';
import './tailwind-output.css';
import './globals.css';
import './marketing.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MarketingMotion } from '@/components/ui/marketing-motion';
import { ShaderBackground } from '@/components/ui/shader-bg';

const geist = Geist({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Voomate — One connected AI team', template: '%s | Voomate' },
  description:
    'Voomate connects a Web Agent, Voice Calling Agent, and Integration Agent for customer conversations and approved business actions.',
  keywords: [
    'AI voice agent',
    'AI chatbot for ecommerce',
    'virtual shopkeeper',
    'multilingual support',
    'AI customer support',
  ],
  openGraph: {
    type: 'website',
    title: 'Voomate — One connected AI team',
    description:
      'A Web Agent, Voice Calling Agent, and Integration Agent working from one shared business context.',
    siteName: 'Voomate',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const widgetOrigin = (process.env.NEXT_PUBLIC_WIDGET_ORIGIN ?? '').replace(/\/$/, '');
  const dogfoodAgentKey = process.env.NEXT_PUBLIC_VOOMATE_DOGFOOD_AGENT_KEY;

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${geist.className} paper-grain`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="site-background" aria-hidden="true">
          <ShaderBackground className="h-full w-full" />
        </div>
        <div className="site-aurora" aria-hidden="true" />
        <MarketingMotion />
        <Navbar />
        <div className="site-content" id="main-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
        {widgetOrigin && dogfoodAgentKey && (
          <Script
            src={`${widgetOrigin}/embed.js`}
            data-agent={dogfoodAgentKey}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
