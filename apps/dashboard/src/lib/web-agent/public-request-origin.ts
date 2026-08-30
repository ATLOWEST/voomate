function firstForwardedValue(value: string | null): string | undefined {
  return value?.split(',', 1)[0]?.trim() || undefined;
}

function safeHost(value: string | undefined): string | undefined {
  if (!value || value.length > 253) return undefined;
  return /^(?:\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

function safeConfiguredOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Returns the browser-reachable origin in deployments where Next.js runs behind an ALB/proxy.
 * The browser Origin header is deliberately not used: widget sessions may be requested from a
 * merchant site, while the relay must remain on Voomate's trusted dashboard edge.
 */
export function publicRequestOrigin(request: Request): string {
  const forwardedHost = safeHost(firstForwardedValue(request.headers.get('x-forwarded-host')));
  const forwardedProto = firstForwardedValue(request.headers.get('x-forwarded-proto'));
  if (forwardedHost && (forwardedProto === 'https' || forwardedProto === 'http')) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const configured = safeConfiguredOrigin(process.env.DASHBOARD_PUBLIC_ORIGIN);
  if (configured) return configured;
  return new URL(request.url).origin;
}
