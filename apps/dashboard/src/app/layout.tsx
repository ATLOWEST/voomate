import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { defineUiManifest, serializeUiManifest } from '@voomate/connect';
import { VoomateNavigationBridge } from '@/components/voomate-navigation-bridge';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Voomate', template: '%s · Voomate' },
  description: 'Voice-first AI agents for your website.',
  // The dashboard holds customer conversation data. Keep it out of search indexes entirely.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090909' },
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

const UI_MANIFEST = serializeUiManifest(
  defineUiManifest({
    businessSummary:
      'Voomate is an AI agent operating system for small and medium businesses. Each workspace chooses the governed agents it needs. Web Agent is available now; CRM Tool Agent is in design, SEO Agent is planned next, and Calling Agent follows.',
    pages: [
      {
        id: 'overview',
        title: 'Overview',
        path: '/',
        description:
          'A live Operating Panel for active agents, SDK health, recent conversations, connections, approvals, and usage.',
        aliases: ['dashboard', 'home', 'workspace', 'main dashboard'],
      },
      {
        id: 'agents',
        title: 'Agents',
        path: '/agents',
        description:
          'Choose from the agent catalog, activate only what the workspace needs, and configure, pause, or connect agent instances.',
        aliases: ['agent board', 'AI team', 'agent pages', 'agents page'],
        facts: [
          'Web Agent is available to add now.',
          'CRM Tool Agent is in design.',
          'SEO Agent is planned after CRM Tool Agent.',
          'Calling Agent is planned after SEO Agent.',
          'Planned agents cannot be provisioned until their runtime and security gates are released.',
        ],
      },
      {
        id: 'web-agent',
        title: 'Web Agent',
        path: '/agents/web',
        description:
          'Configure, test, publish, and inspect the Web Agent that lives inside the business website or app.',
        aliases: ['webagent', 'chat agent', 'website agent', 'widget agent'],
      },
      {
        id: 'voice-agent',
        title: 'Voice Calling Agent',
        path: '/agents/voice',
        description:
          'Configure a Voice Calling Agent for inbound and outbound phone conversations.',
        aliases: ['voice agent', 'calling agent', 'phone agent', 'call agent'],
      },
      {
        id: 'integration-agent',
        title: 'Integration Agent',
        path: '/agents/integration',
        description:
          'Configure an Integration Agent that supplies approved connections and tools to compatible agents.',
        aliases: ['integration hub', 'tool agent', 'connected agent'],
      },
      {
        id: 'integrations',
        title: 'Integrations',
        path: '/integrations',
        description:
          'Connect business systems and inspect the read-only and separately permissioned action capabilities they expose.',
        aliases: ['connect', 'connections', 'apps', 'tools', 'connected systems'],
      },
      {
        id: 'conversations',
        title: 'Conversations',
        path: '/conversations',
        description:
          'Review customer conversations across web chat and voice, with tenant-scoped history and handoff state.',
        aliases: ['customer chats', 'conversation history', 'inbox', 'messages'],
      },
      {
        id: 'logs',
        title: 'Logs',
        path: '/logs',
        description:
          'Trace orchestration decisions, knowledge retrieval, live reads, tool calls, security decisions, and runtime latency.',
        aliases: ['traces', 'audit trail', 'orchestration logs', 'execution logs'],
      },
      {
        id: 'feedback',
        title: 'Feedback',
        path: '/feedback',
        description: 'Review visitor ratings and quality signals for agent replies.',
        aliases: ['ratings', 'quality feedback', 'reply feedback'],
      },
      {
        id: 'approvals',
        title: 'Approvals',
        path: '/approvals',
        description:
          'Review sensitive write actions that require an explicit human confirmation gate.',
        aliases: ['approval queue', 'confirmations', 'sensitive actions'],
      },
      {
        id: 'usage',
        title: 'Usage',
        path: '/usage',
        description: 'Inspect message, voice, model, and action usage for this business account.',
        aliases: ['consumption', 'token usage', 'account usage'],
      },
      {
        id: 'settings',
        title: 'Settings',
        path: '/settings',
        description: 'Manage organization-level platform settings and security controls.',
        aliases: ['workspace settings', 'account settings', 'preferences'],
      },
      {
        id: 'web-agent-playground',
        title: 'Web Agent Playground',
        path: '/agents/web/playground',
        description: 'Test the Web Agent before publishing it to customers.',
        aliases: ['test web agent', 'web agent test', 'chat playground'],
      },
      {
        id: 'web-agent-install',
        title: 'Web Agent Install',
        path: '/agents/web/install',
        description: 'Install or deploy the Web Agent widget to an approved website.',
        aliases: ['deploy web agent', 'install widget', 'publish widget'],
      },
      {
        id: 'admin-merchants',
        title: 'Merchants & Workspaces',
        path: '/admin/merchants',
        description:
          'Provision customer workspaces, assign plan tiers, and manage client storefront quotas.',
        aliases: ['merchants', 'customers', 'workspaces', 'super admin merchants', 'merchants tab'],
      },
      {
        id: 'admin-agents',
        title: 'Agent Fleet & LLMs',
        path: '/admin/agents',
        description:
          'Global inventory of all active customer agents, tool orchestration, and AWS Bedrock model routing.',
        aliases: [
          'agent fleet',
          'llm fleet',
          'agents fleet',
          'agent fellet',
          'model routing',
          'super admin agents',
        ],
      },
      {
        id: 'admin-voice-studio',
        title: 'Voice Edge Studio',
        path: '/admin/voice-studio',
        description:
          'Direct WebRTC speech playground and real-time audio tester powered by Pipecat on port 7860.',
        aliases: ['voice studio', 'pipecat studio', 'voice playground', 'audio tester'],
      },
      {
        id: 'admin-telephony',
        title: 'Telephony & Streams',
        path: '/admin/telephony',
        description:
          'Active WebRTC live audio rooms, SIP trunk connections, and Opus stream quality.',
        aliases: ['telephony', 'streams', 'webrtc rooms', 'sip trunks'],
      },
      {
        id: 'admin-health',
        title: 'Cluster Health & Audit Trace',
        path: '/admin/health',
        description:
          'Operational health matrix for all edge and backend microservices along with real-time audit logs.',
        aliases: ['cluster health', 'system health', 'logs', 'audit trace', 'microservices status'],
      },
    ],
  }),
);

export default function RootLayout({ children }: { children: ReactNode }) {
  const widgetOrigin = (process.env.NEXT_PUBLIC_WIDGET_ORIGIN ?? '').replace(/\/$/, '');
  const dogfoodAgentKey = process.env.NEXT_PUBLIC_VOOMATE_DOGFOOD_AGENT_KEY;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const clientEnvBootstrap = `window.__VOOMATE_ENV__ = ${JSON.stringify({
    supabaseUrl,
    supabaseAnonKey,
  })};`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
        <Script id="client-env-bootstrap" strategy="beforeInteractive">
          {clientEnvBootstrap}
        </Script>
        <Script
          id="voomate-ui-manifest"
          type="application/json"
          data-voomate-ui-manifest
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: UI_MANIFEST }}
        />
      </head>
      <body>
        <VoomateNavigationBridge />
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
