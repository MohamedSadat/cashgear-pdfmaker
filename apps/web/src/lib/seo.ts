import type { Metadata } from 'next';
import { getPathname } from '../i18n/navigation';
import { type Locale, routing } from '../i18n/routing';

/** Localized path for a locale-neutral path: '/merge-pdf' -> '/ar/merge-pdf' for Arabic. */
export function localizedPath(path: string, locale: Locale): string {
  return getPathname({ href: path, locale });
}

/** Canonical URL plus hreflang alternates (en, ar, x-default) for a page. */
export function alternatesFor(path: string, locale: Locale): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedPath(path, l);
  languages['x-default'] = localizedPath(path, routing.defaultLocale);
  return { canonical: localizedPath(path, locale), languages };
}
