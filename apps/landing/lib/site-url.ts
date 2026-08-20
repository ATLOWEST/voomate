const fallbackOrigin = 'https://atlowest.in';

/**
 * Public origin used in metadata and structured data. Keep this build-time configurable so a
 * future primary domain can replace atlowest.in without source-code rewrites.
 */
const configuredOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? fallbackOrigin;

export const SITE_URL = configuredOrigin.replace(/\/$/, '');

export const siteUrl = (path = ''): string =>
  path === '' || path === '/' ? SITE_URL : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
