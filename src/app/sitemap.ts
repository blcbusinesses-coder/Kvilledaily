import type { MetadataRoute } from 'next';
import { getAllArticleSlugs } from '@/lib/supabase';
import { CATEGORIES, CATEGORY_SLUGS } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kendallvilledaily.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllArticleSlugs();
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    ...CATEGORIES.map((cat) => ({
      url: `${SITE_URL}/category/${CATEGORY_SLUGS[cat]}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
  ];

  const articleRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/article/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
