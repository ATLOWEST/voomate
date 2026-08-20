import type { Agent } from '@voomate/core';

function serialize(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

/**
 * Publishes a count-only view of state already visible in the signed-in dashboard. The widget
 * gets enough context to guide setup without receiving agent IDs, names, domains, or credentials.
 */
export function VoomateOperatingContext({ agents }: { agents: readonly Agent[] | undefined }) {
  if (!agents) return null;
  const active = agents.filter(({ status }) => status === 'active').length;
  const draft = agents.filter(({ status }) => status === 'draft').length;
  const paused = agents.filter(({ status }) => status === 'paused').length;

  return (
    <script
      type="application/json"
      data-voomate-operating-context
      dangerouslySetInnerHTML={{
        __html: serialize({
          version: 1,
          agentInventory: { total: agents.length, active, draft, paused },
        }),
      }}
    />
  );
}
