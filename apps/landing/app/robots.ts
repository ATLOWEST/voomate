import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/seller/', '/admin/', '/api/', '/referral/', '/supplier/'],
      },
    ],
    sitemap: 'https://voomate.ai/sitemap.xml',
    host: 'https://voomate.ai',
  };
}
