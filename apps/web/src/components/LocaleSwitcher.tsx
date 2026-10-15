'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '../i18n/navigation';
import { routing } from '../i18n/routing';

/** A real link to the same page in the other language, so crawlers can follow it too. */
export function LocaleSwitcher({ label, title }: { label: string; title: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      title={title}
      className="rounded-md border px-3 py-1.5 hover:bg-accent"
    >
      {label}
    </Link>
  );
}
