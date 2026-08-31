'use client';
import { SITE_URL, siteUrl } from '@/lib/site-url';

/* ------------------------------------------------------------------ */
/*  Reusable JSON-LD structured data components for SEO               */
/* ------------------------------------------------------------------ */

interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Generic JSON-LD injector — renders a <script type="application/ld+json"> */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

/* ---- Organization ------------------------------------------------ */

const ORGANIZATION_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Voomate',
  url: SITE_URL,
  logo: siteUrl('/logo.png'),
  description:
    'Voomate is an AI-native operating system that connects a Web Agent, Voice Calling Agent, and Integration Agent for customer conversations and approved business actions.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: siteUrl('/about'),
  },
};

export function OrganizationJsonLd() {
  return <JsonLd data={ORGANIZATION_DATA} />;
}

/* ---- SoftwareApplication ----------------------------------------- */

const SOFTWARE_APP_DATA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Voomate',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'AI operating system connecting web, voice, and integration agents for customer conversations and approved business actions.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Pay as you go',
      price: '0',
      priceCurrency: 'INR',
      description:
        'Starts at ₹0. First top-up includes 300 bonus credits, with 60 requests per minute, one workspace, basic analytics, and community support.',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '10000',
      priceCurrency: 'INR',
      description:
        '₹10,000/month — 12,000 credits, ₹2,000 bonus credits, 200 requests per minute, email support, multilingual conversations, and custom widget branding.',
    },
    {
      '@type': 'Offer',
      name: 'Max',
      price: '20000',
      priceCurrency: 'INR',
      description:
        '₹20,000/month — 25,000 credits, ₹5,000 bonus credits, 500 requests per minute, and priority support.',
    },
  ],
};

export function SoftwareApplicationJsonLd() {
  return <JsonLd data={SOFTWARE_APP_DATA} />;
}

/* ---- FAQPage ----------------------------------------------------- */

interface FaqItem {
  q: string;
  a: string;
}

export function FaqPageJsonLd({ faqs }: { faqs: FaqItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
  return <JsonLd data={data} />;
}

/* ---- BreadcrumbList ---------------------------------------------- */

interface BreadcrumbItem {
  name: string;
  href: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: siteUrl(item.href),
    })),
  };
  return <JsonLd data={data} />;
}

/* ---- WebPage ----------------------------------------------------- */

export function WebPageJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: siteUrl(url),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Voomate',
      url: SITE_URL,
    },
  };
  return <JsonLd data={data} />;
}
