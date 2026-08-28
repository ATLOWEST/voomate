interface WebAgentInstallInput {
  widgetOrigin: string;
  embedKey: string;
  setupEndpoint?: string;
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
export function buildWebAgentSnippet({
  widgetOrigin,
  embedKey,
  setupEndpoint = '/api/voomate/setup',
}: WebAgentInstallInput): string {
  return `<script
  src="${widgetOrigin.replace(/\/$/, '')}/embed.js"
  data-agent="${embedKey}"
  data-setup-endpoint="${setupEndpoint}"
  async
></script>`;
}

export function buildVerifiedUserSnippet({
  widgetOrigin,
  embedKey,
  identityEndpoint = '/api/voomate/setup',
}: WebAgentInstallInput & { identityEndpoint?: string }): string {
  return buildWebAgentSnippet({ widgetOrigin, embedKey, setupEndpoint: identityEndpoint });
}

export function buildIdentityServerExample({
  controlPlaneOrigin,
}: Pick<IdentityInstallInput, 'controlPlaneOrigin' | 'approvedOrigins'>): string {
  return `// Server-only endpoint: POST /api/voomate/setup
export async function POST(request) {
  const input = await request.json();
  const pageUrl = new URL(input.pageUrl);
  const deployedOrigin = new URL(request.url).origin;
  if (pageUrl.origin !== deployedOrigin) {
    return Response.json({ error: "Origin mismatch" }, { status: 400 });
  }

  const response = await fetch("${controlPlaneOrigin.replace(/\/$/, '')}/v1/widget/installations/claim", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${process.env.VOOMATE_API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      origin: deployedOrigin,
      pathname: pageUrl.pathname,
      routes: Array.isArray(input.routes) ? input.routes : []
    })
  });

  if (!response.ok) return new Response(null, { status: response.status });
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
  identityEndpoint = '/api/voomate/setup',
}: IdentityInstallInput): string {
  const snippet = buildVerifiedUserSnippet({ widgetOrigin, embedKey, identityEndpoint });
  const serverExample = buildIdentityServerExample({ controlPlaneOrigin, approvedOrigins: [] });
  return `Complete the Voomate Web Agent installation for “${agentName}” in this project.

The business owner should not have to make technical decisions. Inspect this project's real framework, layouts, router, and hosting pattern, then make the smallest safe production change.

Do this end-to-end:
1. Add the exact browser script below once to the shared public website/web-app layout.
2. Never add it to admin, staff, sign-in, account-security, payment, checkout, health, or other sensitive layouts.
3. Create the same-origin POST endpoint ${identityEndpoint}. It must derive the deployed origin from the server request URL—not from an untrusted browser header—and call ${controlPlaneOrigin.replace(/\/$/, '')}/v1/widget/installations/claim with Authorization: Bearer process.env.VOOMATE_API_KEY.
4. Tell the owner exactly where to add the private VOOMATE_API_KEY in this hosting provider. The key belongs only in the server secret manager: never browser code, source files, Git, logs, a public environment variable, or this chat.
5. Forward only pageUrl.pathname and the SDK's path-only route list. Never forward query strings, cookies, form values, source code, browser storage, or customer data.
6. If the project has signed-in customer pages, reuse its existing server authentication and exchange the server user ID through /v1/widget/identity. Never accept a user ID from the browser and do not create another login system.
7. Read the real router configuration and add a path-only data-voomate-route-manifest JSON block to the same public layout so lazy and parameterized routes are represented without reading private data. Do not invent route names.
8. Run the project checks, deploy the change, and report: changed files, the hosting-secret location, and one approved public URL. Do not expose private values in the report.

Exact shared-layout script:
${snippet}

Server endpoint reference (adapt exports to the project's framework without weakening its checks):
${serverExample}`;
}

/**
 * A short, self-contained task merchants can paste into their coding assistant. It tells the
 * assistant where the SDK may run while keeping authentication, payments and private areas out.
 */
export function buildWebAgentAssistantPrompt({
  widgetOrigin,
  embedKey,
  agentName,
}: AssistantPromptInput): string {
  const snippet = buildWebAgentSnippet({ widgetOrigin, embedKey });
  return `Install the Voomate Web Agent “${agentName}” in this project.

Requirements:
1. Add the exact script below once to the shared public site layout, just before </body>.
2. Implement its same-origin ${'/api/voomate/setup'} server endpoint using a VOOMATE_API_KEY stored only in the hosting secret manager. The endpoint calls the Voomate installation-claim API so domains and routes appear automatically.
3. Keep all existing behavior unchanged. Do not create, request, log, or expose any private key. The data-agent value below is a public, domain-bound installation ID.
4. After editing, run the project checks and report the changed files plus one public URL I should open for Voomate verification.

Exact script:
${snippet}`;
}
