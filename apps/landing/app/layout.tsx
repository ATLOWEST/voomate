import type { Metadata } from 'next';
import './tailwind-output.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Voomate — AI Virtual Shopkeeper for Merchants', template: '%s | Voomate' },
  description:
    'Voomate deploys an AI virtual shopkeeper on your storefront. Handles voice, chat, and 30+ languages — fully automated customer support, 24/7.',
  keywords: [
    'AI voice agent',
    'AI chatbot for ecommerce',
    'virtual shopkeeper',
    'multilingual support',
    'AI customer support',
  ],
  openGraph: {
    type: 'website',
    title: 'Voomate — AI Virtual Shopkeeper for Merchants',
    description:
      'End-to-end AI customer handling across voice, chat, and 30+ languages. One line of code. Deploy in 5 minutes.',
    siteName: 'Voomate',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
