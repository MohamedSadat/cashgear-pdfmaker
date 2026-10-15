// Single swap point for translations. Components use use-intl directly (not next-intl) so the
// desktop renderer can reuse them without Next.js. The web app's NextIntlClientProvider supplies
// the same context because next-intl is built on use-intl.
export { IntlProvider, useFormatter, useLocale, useTranslations } from 'use-intl';
