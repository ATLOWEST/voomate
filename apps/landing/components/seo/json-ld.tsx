'use client';

/* ------------------------------------------------------------------ */
/*  Reusable JSON-LD structured data components for SEO               */
/* ------------------------------------------------------------------ */

interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Generic JSON-LD injector — renders a <script type="application/ld+json"> */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ---- Organization ------------------------------------------------ */

const ORGANIZATION_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Voomate',
  url: 'https://voomate.ai',
  logo: 'https://voomate.ai/logo.png',
  description:
    'Voomate is an AI-native operating system that connects a Web Agent, Voice Calling Agent, and Integration Agent for customer conversations and approved business actions.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: 'https://voomate.ai/about',
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
  url: 'https://voomate.ai',
  description:
    'AI operating system connecting web, voice, and integration agents for customer conversations and approved business actions.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free — 100 conversations per month, one three-agent workspace, website chat and voice.',
    },
    {
      '@type': 'Offer',
      name: 'Growth',
      price: '2499',
      priceCurrency: 'INR',
      description: '₹2,499/month — 5,000 conversations, all three agents, multilingual, approved action tools.',
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
      item: `https://voomate.ai${item.href}`,
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
    url: `https://voomate.ai${url}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Voomate',
      url: 'https://voomate.ai',
    },
  };
  return <JsonLd data={data} />;
}
