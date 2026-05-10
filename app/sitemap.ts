// app/sitemap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Auto-generates /sitemap.xml for Google and other search engines.
// Lists every public page with its priority and update frequency.
//
// WHY THIS MATTERS:
//   A sitemap tells Google which pages exist and how important they are.
//   Without it, Google might take weeks to discover /tools or /store.
//   With it, new pages are typically indexed within 24–48 hours.
// ─────────────────────────────────────────────────────────────────────────────
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexa-technologies.netlify.app';
  const now  = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${base}/services`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/store`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/tools`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
