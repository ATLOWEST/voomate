const fallbackOrigin = 'https://atlowest.in';

const configuredOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? fallbackOrigin;

export const SITE_URL = configuredOrigin.replace(/\/$/, '');

export const siteUrl = (path = ''): string =>
  path === '' || path === '/' ? SITE_URL : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
