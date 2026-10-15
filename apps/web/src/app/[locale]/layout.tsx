import { BRAND } from '@repo/ui/brand';
import { DirectionProvider } from '@repo/ui/direction';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
import { localeDir, routing } from '../../i18n/routing';
import { isIndexable, siteUrl } from '../../lib/site';

const latin = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-latin' });
// Not preloaded: English pages never need it, Arabic pages fetch it on first use.
const arabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-arabic',
});

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
    description: t('description'),
    applicationName: BRAND.name,
    robots: isIndexable() ? undefined : { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations('site');
  const dir = localeDir[locale];

  return (
    <html lang={locale} dir={dir} className={`${latin.variable} ${arabic.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
        >
          {t('skipToContent')}
        </a>
        {/* Only the component strings go to the client; page copy stays on the server. */}
        <NextIntlClientProvider messages={{ ui: messages.ui }}>
          <DirectionProvider dir={dir}>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </DirectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
