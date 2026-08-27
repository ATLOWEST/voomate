interface WebAgentInstallInput {
  widgetOrigin: string;
  embedKey: string;
}

interface AssistantPromptInput extends WebAgentInstallInput {
  agentName: string;
  approvedOrigins: readonly string[];
}

interface IdentityInstallInput extends AssistantPromptInput {
  controlPlaneOrigin: string;
  identityEndpoint?: string;
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

export function buildVerifiedUserSnippet({
  widgetOrigin,
  embedKey,
  identityEndpoint = '/api/voomate/identity',
}: WebAgentInstallInput & { identityEndpoint?: string }): string {
  return `<script
  src="${widgetOrigin.replace(/\/$/, '')}/embed.js"
  data-agent="${embedKey}"
  data-identity-endpoint="${identityEndpoint}"
  async
></script>`;
}

export function buildIdentityServerExample({
  controlPlaneOrigin,
  approvedOrigins,
}: Pick<IdentityInstallInput, 'controlPlaneOrigin' | 'approvedOrigins'>): string {
  const origin = approvedOrigins[0] ?? 'https://your-approved-domain.example';
  return `// Server-only endpoint: POST /api/voomate/identity
// Replace requireCurrentUser with this project's existing server auth helper.
export async function POST(request) {
  const user = await requireCurrentUser(request);
  if (!user) return new Response(null, { status: 401 });

  const response = await fetch("${controlPlaneOrigin.replace(/\/$/, '')}/v1/widget/identity", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${process.env.VOOMATE_IDENTITY_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      userId: user.id,
      origin: "${origin}"
    })
  });

  if (!response.ok) return new Response(null, { status: 401 });
  return Response.json(await response.json(), {
    headers: { "Cache-Control": "no-store" }
  });
}`;
}

export function buildIdentityAssistantPrompt({
  widgetOrigin,
  controlPlaneOrigin,
  embedKey,
  agentName,
  approvedOrigins,
  identityEndpoint = '/api/voomate/identity',
}: IdentityInstallInput): string {
  const snippet = buildVerifiedUserSnippet({ widgetOrigin, embedKey, identityEndpoint });
  const origins =
    approvedOrigins.length > 0
      ? approvedOrigins.map((origin) => `- ${origin}`).join('\n')
      : '- Ask me for the production origin before editing.';

  return `Add signed-in customer verification for the Voomate Web Agent “${agentName}”.

Approved origins:
${origins}

Use the application's EXISTING server authentication. Do not invent another login system.
1. Create a same-origin POST endpoint at ${identityEndpoint}. It must reject unauthenticated requests.
2. On the server, read the authenticated user's stable internal ID. Never accept a user ID supplied by the browser.
3. Call ${controlPlaneOrigin.replace(/\/$/, '')}/v1/widget/identity with Authorization: Bearer process.env.VOOMATE_IDENTITY_KEY and JSON { userId, origin }.
4. Return only the short-lived token JSON with Cache-Control: no-store. Never send, log, bundle, or prefix the server key with NEXT_PUBLIC/VITE_PUBLIC.
5. Add the exact script below once to the authenticated shared layout. Keep it out of payment, admin, health and any routes excluded in Voomate.
6. Add VOOMATE_IDENTITY_KEY to the deployment secret manager, run the project's tests, and report the endpoint plus changed files.

Exact authenticated-layout script:
${snippet}`;
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
