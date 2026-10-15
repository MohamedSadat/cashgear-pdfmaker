import { webTools } from '@repo/pdf-client';
import type { MetadataRoute } from 'next';
import { routing } from '../i18n/routing';
import { localizedPath } from '../lib/seo';
import { absoluteUrl } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', ...webTools().map((tool) => `/${tool.slug}`)];
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(
      routing.locales.map((l) => [l, absoluteUrl(localizedPath(path, l))]),
    );
    return routing.locales.map((locale) => ({
      url: absoluteUrl(localizedPath(path, locale)),
      alternates: { languages },
      changeFrequency: 'monthly' as const,
      priority: path === '/' ? 1 : 0.8,
    }));
  });
}
