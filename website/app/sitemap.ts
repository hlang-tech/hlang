import type { MetadataRoute } from 'next';
import { getApiPackages, getGuides } from '@/lib/docs';
import { siteUrl } from '@/lib/site';

/** Every page, from the same sources as the navigation. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const paths = [
    '/',
    '/docs/api',
    '/brand',
    '/changelog',
    ...getGuides().map(guide => `/docs/${guide.slug}`),
    ...getApiPackages().map(item => `/docs/api/${item.short}`),
  ];
  return paths.map(pathname => ({ url: new URL(pathname, base).toString() }));
}
