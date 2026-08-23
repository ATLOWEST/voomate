/**
 * Returns a path that is safe to use as an in-app post-auth redirect.
 * URLs, protocol-relative paths, and backslashes are rejected to prevent
 * open redirects after a successful sign-in.
 */
export function safeInternalPath(value: string | null | undefined, fallback = '/agents'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  return value;
}
