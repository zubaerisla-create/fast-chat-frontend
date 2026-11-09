import type { MetadataRoute } from 'next';
import { publicRoutes, site } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((r) => ({
    url: `${site.url}${r.path === '/' ? '' : r.path}`,
    lastModified: new Date(site.legalLastUpdated),
    changeFrequency: r.path === '/' || r.path === '/pricing' ? 'weekly' : 'monthly',
    priority: r.path === '/' ? 1 : r.path === '/pricing' ? 0.8 : 0.5,
  }));
}
