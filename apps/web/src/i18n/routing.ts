import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  // English lives at /, Arabic at /ar.
  localePrefix: 'as-needed',
  // Never redirect crawlers or first-time visitors away from the URL they asked for.
  localeDetection: false,
  // Without detection the cookie is useless, and a Set-Cookie header stops CDN caching of pages.
  localeCookie: false,
  // hreflang comes from page metadata (one source of truth, visible in the HTML).
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

export const localeDir: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl' };
