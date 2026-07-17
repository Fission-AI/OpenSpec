import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

// Static sitemap, emitted as sitemap.xml by the static export.
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, '');
  const docs = source.getPages().map((page) => ({
    url: `${base}${page.url}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: `${base}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...docs,
  ];
}
