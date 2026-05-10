// app/robots.ts
// Generates /robots.txt for search engine crawlers.
// Allows all public pages, blocks admin routes.
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexa-technologies.netlify.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/services', '/store', '/tools', '/about'],
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
