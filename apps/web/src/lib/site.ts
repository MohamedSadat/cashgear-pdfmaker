/** Absolute origin of the site, used for canonical URLs, hreflang and the sitemap. */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Only the launch environment sets NEXT_PUBLIC_INDEXABLE=true. Everywhere else (staging,
 * previews, local) pages are noindex and robots.txt disallows crawling.
 */
export function isIndexable(): boolean {
  return process.env.NEXT_PUBLIC_INDEXABLE === 'true';
}

export function absoluteUrl(path: string): string {
  return path === '/' ? siteUrl() : `${siteUrl()}${path}`;
}
