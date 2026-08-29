'use client';

import { useEffect } from 'react';
import type { Agent } from '@voomate/core';
import { webDeploymentPolicyFromAppearance, webSurfaceForLocation } from '@voomate/core';
import { useApiQuery } from '@/lib/hooks';
import { useSession } from '@/lib/session';

const WIDGET_ORIGIN = (
  process.env.NEXT_PUBLIC_WIDGET_ORIGIN ??
  (process.env.NODE_ENV === 'production' ? 'https://app.atlowest.in' : 'http://localhost:3001')
).replace(/\/$/, '');

/**
 * Installs the merchant's selected Web Agent in the merchant portal only. This component lives
 * under `(app)`, while the Super Admin portal has its own layout, making platform-admin pages a
 * structural exclusion rather than a checkbox that can accidentally be turned on.
 */
export function MerchantWebAgentBootstrap() {
  const { organization } = useSession();
  const { data, refetch } = useApiQuery<{ agents: Agent[] }>(
    organization === undefined ? null : '/v1/agents',
  );

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener('voomate:agent-configuration-updated', refresh);
    return () => window.removeEventListener('voomate:agent-configuration-updated', refresh);
  }, [refetch]);

  useEffect(() => {
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname;
    const agent = data?.agents.find((candidate) => {
      if (candidate.catalogType !== 'web' || !candidate.embedKey) return false;
      const policy = webDeploymentPolicyFromAppearance(
        candidate.appearance,
        candidate.allowedOrigins,
      );
      return webSurfaceForLocation(policy, currentOrigin, currentPath) !== undefined;
    });

    if (!agent || !WIDGET_ORIGIN) return;

    document.documentElement.dataset.voomateActiveRole = 'merchant_admin';
    document.documentElement.dataset.voomatePortalScope = '/';

    const selector = `script[data-voomate-managed-agent="${agent.id}"]`;
    if (document.querySelector(selector)) return;

    const script = document.createElement('script');
    script.src = `${WIDGET_ORIGIN}/embed.js`;
    script.async = true;
    script.dataset.agent = agent.embedKey;
    // This is intentionally a same-origin dashboard endpoint. It reads the server-only key from
    // the merchant app's secret manager; the key never reaches the browser or embed script.
    script.dataset.setupEndpoint = '/api/voomate/setup';
    script.dataset.voomateManagedAgent = agent.id;
    document.body.append(script);

    return () => {
      script.remove();
      document
        .querySelectorAll(`voomate-agent[data-voomate-agent="${cssValue(agent.embedKey)}"]`)
        .forEach((element) => element.remove());
    };
  }, [data]);

  return null;
}

function cssValue(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
