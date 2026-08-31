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
        facts: [
          'Voomate connects Web Agent, Voice Calling Agent, and Integration Agent through one shared business context.',
          'Web Agent handles customer questions on the website and can use only approved actions.',
          'Voice Calling Agent supports natural phone conversations, while Integration Agent provides governed access to connected business systems.',
          'Read-only data, separately permissioned actions, approvals, and logs keep the business in control.',
        ],
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
          'Pay as you go starts at ₹0. The first top-up includes 300 bonus credits, with 60 requests per minute, one workspace, basic analytics, and community support.',
          'Pro costs ₹10,000 per month and includes 12,000 credits, ₹2,000 bonus credits, 200 requests per minute, email support, multilingual conversations, and custom widget branding.',
          'Max costs ₹20,000 per month and includes 25,000 credits, ₹5,000 bonus credits, 500 requests per minute, and priority support.',
          'Custom is tailored for organizations with high-volume needs.',
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
    trustedDestinations: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        url: 'https://app.atlowest.in/',
        description: 'Sign in to access and manage your Voomate workspace.',
        aliases: ['dashboard', 'workspace', 'my account', 'account dashboard', 'admin panel'],
      },
    ],
  }),
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {/*
          Voomate's own public site is a real end-to-end installation of the Web Agent. The
          agent identifier is public by design; the server-only verification key never appears
          in this page or bundle. `/voomate/setup` is served through the landing distribution and
          forwards to the protected dashboard setup handler.
        */}
        <Script
          id="voomate-web-agent"
          src="https://app.atlowest.in/embed.js"
          data-agent="sq_Q5SlJQEgPmNgdHD1rwc4DCRF"
          data-setup-endpoint="/voomate/setup"
          strategy="afterInteractive"
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
      </body>
    </html>
  );
}
