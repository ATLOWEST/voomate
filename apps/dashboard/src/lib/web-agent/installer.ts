interface WebAgentInstallInput {
  widgetOrigin: string;
  embedKey: string;
}

interface AssistantPromptInput extends WebAgentInstallInput {
  agentName: string;
  approvedOrigins: readonly string[];
}

interface OneClickInstallInput extends AssistantPromptInput {
  installGrant: string;
  challengePath: string;
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

/** Compatibility helper: Web setup always uses the standard same-origin /voomate/setup path. */
export function buildVerifiedUserSnippet(input: WebAgentInstallInput): string {
  return buildWebAgentSnippet(input);
}

export type ServerFramework = 'nextjs' | 'express' | 'php';

export function buildServerSetupSnippet({
  framework,
  controlPlaneOrigin,
}: {
  framework: ServerFramework;
  controlPlaneOrigin: string;
}): string {
  const claimUrl = `${controlPlaneOrigin.replace(/\/$/, '')}/v1/widget/installations/claim`;
  if (framework === 'express') {
    return `// Add to your existing Express server
app.post('/voomate/setup', async (req, res) => {
  const pageUrl = new URL(req.body.pageUrl);
  const origin = \`\${req.protocol}://\${req.get('host')}\`;
  if (pageUrl.origin !== origin) return res.status(400).json({ error: 'Origin mismatch' });

  const response = await fetch('${claimUrl}', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer ${'${process.env.VOOMATE_API_KEY}'}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ origin, pathname: pageUrl.pathname, routes: req.body.routes ?? [] }),
  });
  if (!response.ok) return res.sendStatus(response.status);
  return res.status(200).json(await response.json());
});`;
  }
  if (framework === 'php') {
    return `<?php
// Create public/voomate/setup/index.php (or route POST /voomate/setup here).
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$origin = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
$page = parse_url($input['pageUrl'] ?? '');
$pageOrigin = is_array($page) && isset($page['scheme'], $page['host'])
  ? $page['scheme'] . '://' . $page['host'] . (isset($page['port']) ? ':' . $page['port'] : '')
  : '';
if ($pageOrigin !== $origin) { http_response_code(400); exit; }

$request = curl_init('${claimUrl}');
curl_setopt_array($request, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . getenv('VOOMATE_API_KEY'),
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'origin' => $origin,
    'pathname' => $page['path'] ?? '/',
    'routes' => $input['routes'] ?? [],
  ]),
  CURLOPT_RETURNTRANSFER => true,
]);
$body = curl_exec($request);
$status = curl_getinfo($request, CURLINFO_RESPONSE_CODE);
curl_close($request);
http_response_code($status ?: 502);
header('Content-Type: application/json');
echo $body ?: '{}';`;
  }
  return `// Create: app/voomate/setup/route.ts
export async function POST(request: Request) {
  const input = await request.json();
  const pageUrl = new URL(input.pageUrl);
  const origin = new URL(request.url).origin;
  if (pageUrl.origin !== origin) {
    return Response.json({ error: 'Origin mismatch' }, { status: 400 });
  }

  const response = await fetch('${claimUrl}', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer ${'${process.env.VOOMATE_API_KEY}'}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin,
      pathname: pageUrl.pathname,
      routes: Array.isArray(input.routes) ? input.routes : [],
    }),
  });
  if (!response.ok) return new Response(null, { status: response.status });
  return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
}`;
}

export function buildIdentityServerExample({
  controlPlaneOrigin,
}: {
  controlPlaneOrigin: string;
  approvedOrigins: readonly string[];
}): string {
  return buildServerSetupSnippet({ framework: 'nextjs', controlPlaneOrigin });
}

export function buildOneClickAssistantPrompt({
  widgetOrigin,
  embedKey,
  agentName,
  installGrant,
  challengePath,
}: OneClickInstallInput): string {
  const snippet = buildWebAgentSnippet({ widgetOrigin, embedKey });
  return `Install the Voomate Web Agent “${agentName}” completely in this project.

This is a one-request production installation. Inspect the repository before editing. Detect its real framework, router, layout boundaries, build command, and deployment model. Do not ask the business owner to choose technical files, enter a domain, create an API endpoint, or configure a permanent API key.

Required result:
1. Add the exact script below once to every shared browser layout that serves a customer-facing product surface. This may include public marketing pages and signed-in customer applications when they exist. Do not guess from folder names: follow the actual router and layout tree. Never add the script to server-only code, API handlers, health endpoints, payment-provider callbacks, or infrastructure consoles.
2. Create the exact plain-text verification file below in the framework's public/static asset root so its deployed URL is exactly ${challengePath}. If this repository deploys multiple customer-facing origins, publish the same file and script in each applicable app during this installation. Do not put the grant in JavaScript, environment variables, logs, or any file other than this temporary verification file.
3. Inspect the real route definitions. Add one path-only data-voomate-route-manifest JSON block beside the script when the router contains lazy, parameterized, or non-linked customer pages. Include every real customer-facing route pattern once. Do not include query strings, page content, cookies, form data, authentication tokens, source code, or invented routes.
4. Preserve all existing authentication, authorization, rendering, and navigation behavior. Voomate route controls decide where the agent is enabled; installation must not grant the agent access to private page data.
5. Run the repository's existing typecheck, tests, and build. Deploy through its existing production workflow if deployment access is already available. Do not create a second hosting system.
6. Verify the deployed page loads the exact script once and that ${challengePath} returns only the exact grant below as text. Report changed files, deployed origins, checks run, and any deployment blocker. Never claim success from local files alone.

Exact browser script:
${snippet}

Exact verification file path:
${challengePath}

Exact verification file content (short-lived and installation-only):
${installGrant}

The grant can only verify this agent installation and expires automatically. It cannot read data, identify customers, create sessions, or manage the workspace.`;
}
