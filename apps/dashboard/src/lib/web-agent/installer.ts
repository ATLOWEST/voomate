interface WebAgentInstallInput {
  widgetOrigin: string;
  embedKey: string;
}

interface AssistantPromptInput extends WebAgentInstallInput {
  agentName: string;
  approvedOrigins: readonly string[];
}

/**
 * Converts a pasted hostname or page URL to the exact origin used by the runtime allowlist.
 * Paths are intentionally removed because browser Origin headers never include them.
 */
export function toWebOrigin(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** The data-agent value is a public, origin-bound installation ID—not a private API key. */
export function buildWebAgentSnippet({ widgetOrigin, embedKey }: WebAgentInstallInput): string {
  return `<script
  src="${widgetOrigin.replace(/\/$/, '')}/embed.js"
  data-agent="${embedKey}"
  async
></script>`;
}

/**
 * A short, self-contained task merchants can paste into their coding assistant. It tells the
 * assistant where the SDK may run while keeping authentication, payments and private areas out.
 */
export function buildWebAgentAssistantPrompt({
  widgetOrigin,
  embedKey,
  agentName,
  approvedOrigins,
}: AssistantPromptInput): string {
  const snippet = buildWebAgentSnippet({ widgetOrigin, embedKey });
  const origins =
    approvedOrigins.length === 0
      ? 'No domain is approved yet. Ask me for the public domain before editing.'
      : approvedOrigins.map((origin) => `- ${origin}`).join('\n');

  return `Install the Voomate Web Agent “${agentName}” in this project.

Approved public origins:
${origins}

Requirements:
1. Add the exact script below once to the shared public site layout, just before </body>.
2. Load it only on approved public pages. Do not add it to admin-only, authenticated, account, checkout, payment, health, or other sensitive routes.
3. Keep all existing behavior unchanged. Do not create, request, log, or expose any private key. The data-agent value below is a public, domain-bound installation ID.
4. After editing, run the project checks and report the changed files plus one public URL I should open for Voomate verification.

Exact script:
${snippet}`;
}
