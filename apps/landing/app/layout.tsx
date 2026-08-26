import type { Metadata } from 'next';
import { OrganizationJsonLd } from '@/components/seo/json-ld';
import Script from 'next/script';
import { defineUiManifest, serializeUiManifest } from '@voomate/connect';
import { Geist, Plus_Jakarta_Sans } from 'next/font/google';
import './tailwind-output.css';
import './globals.css';
import './marketing.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MarketingMotion } from '@/components/ui/marketing-motion';
import { ShaderBackground } from '@/components/ui/shader-bg';
import { VoomateNavigationBridge } from '@/components/voomate-navigation-bridge';
import { SITE_URL } from '@/lib/site-url';

const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Voomate — One connected AI team', template: '%s | Voomate' },
  description:
    'Voomate connects a Web Agent, Voice Calling Agent, and Integration Agent for customer conversations and approved business actions.',
  keywords: [
    'AI voice agent',
    'AI chatbot for ecommerce',
    'virtual shopkeeper',
    'multilingual support',
    'AI customer support',
    'AI agent platform',
    'voice AI for business',
    'AI operating system',
  ],
  openGraph: {
    type: 'website',
    title: 'Voomate — One connected AI team',
    description:
      'A Web Agent, Voice Calling Agent, and Integration Agent working from one shared business context.',
    siteName: 'Voomate',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voomate — One connected AI team',
    description:
      'AI operating system connecting web, voice, and integration agents for customer conversations and approved business actions.',
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: '/',
  },
};

const UI_MANIFEST = serializeUiManifest(
  defineUiManifest({
    businessSummary:
      'Voomate helps small and medium businesses become AI-native through a governed agent catalog. Web Agent is available now; CRM Tool Agent is in design, SEO Agent is planned next, and Calling Agent follows.',
    pages: [
      {
        id: 'home',
        title: 'Voomate',
        path: '/',
        description:
          'An introduction to Voomate as one connected AI team for customer conversations and real business work.',
        aliases: ['home', 'main page', 'homepage'],
      },
      {
        id: 'product',
        title: 'Product',
        path: '/product',
        description:
          'How Voomate coordinates customer-facing agents, governed tools, and approved business workflows.',
        aliases: ['features', 'how it works', 'AI agents', 'platform'],
      },
      {
        id: 'integrations',
        title: 'Integrations',
        path: '/integrations',
        description:
          'How Voomate connects to business systems through read-only data access and permissioned actions.',
        aliases: ['connections', 'connected tools', 'apps', 'business systems'],
      },
      {
        id: 'industries',
        title: 'Industries',
        path: '/industries',
        description:
          'Examples of how one universal Voomate agent system adapts to different business workflows without industry-specific agent types.',
        aliases: ['use cases', 'business types', 'solutions'],
      },
      {
        id: 'pricing',
        title: 'Pricing',
        path: '/pricing',
        description: 'Plans and included platform usage.',
        aliases: ['plans', 'billing plans', 'cost', 'price', 'subscriptions'],
        facts: [
          'Starter is free and includes 100 conversations each month, one three-agent workspace, website chat and voice, grounded knowledge answers, and community support.',
          'Growth costs ₹2,499 per month and includes 5,000 monthly conversations, all three agents, multilingual conversations, approved action tools, live data, adapters, reports, and custom widget branding.',
          'Growth includes a 14-day trial.',
          'Enterprise uses custom pricing for custom volume, multiple tenant-scoped workspaces, dedicated onboarding, custom adapters, security review support, and priority support.',
          'Every plan uses tenant-scoped data, controlled tools, and visible usage; the safety model is not a paid add-on.',
        ],
      },
      {
        id: 'about',
        title: 'About',
        path: '/about',
        description: 'Why Voomate exists and the operating principles behind the product.',
        aliases: ['company', 'story', 'mission', 'why Voomate'],
      },
    ],
  }),
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configuredWidgetOrigin = (process.env.NEXT_PUBLIC_WIDGET_ORIGIN ?? '').replace(/\/$/, '');
  const widgetOrigin = /^https:\/\//.test(configuredWidgetOrigin)
    ? configuredWidgetOrigin
    : process.env.NODE_ENV === 'development'
      ? configuredWidgetOrigin || 'http://localhost:3001'
      : '';
  const dogfoodAgentKey = process.env.NEXT_PUBLIC_VOOMATE_DOGFOOD_AGENT_KEY;

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${geist.className} ${displayFont.variable} paper-grain`}>
        <VoomateNavigationBridge />
        <Script
          id="voomate-ui-manifest"
          type="application/json"
          data-voomate-ui-manifest
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: UI_MANIFEST }}
        />
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
