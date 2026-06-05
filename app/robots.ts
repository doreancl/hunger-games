import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hunger-games.sebecode.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/new', '/sessions/*']
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
