import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Voomate', template: '%s · Voomate' },
  description: 'Voice-first AI agents for your website.',
  // The dashboard holds customer conversation data. Keep it out of search indexes entirely.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f1ed' },
    { media: '(prefers-color-scheme: dark)', color: '#080706' },
  ],
};

/**
 * Applied before first paint. Without it the page renders light, then snaps to dark once
 * React hydrates — the single most obvious "cheap software" tell in a dashboard.
 */
const THEME_BOOTSTRAP = `
(function(){try{
  var stored = localStorage.getItem('voomate-theme');
  var dark = stored ? stored === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.setAttribute('data-theme','dark');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const widgetOrigin = (process.env.NEXT_PUBLIC_WIDGET_ORIGIN ?? '').replace(/\/$/, '');
  const dogfoodAgentKey = process.env.NEXT_PUBLIC_VOOMATE_DOGFOOD_AGENT_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
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
