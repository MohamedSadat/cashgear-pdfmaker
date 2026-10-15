import uiAr from '@repo/ui/messages/ar.json';
import uiEn from '@repo/ui/messages/en.json';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import webAr from '../../messages/ar.json';
import webEn from '../../messages/en.json';
import { routing } from './routing';

// Page copy (server only) plus the component strings under `ui` (sent to the client).
const messages = {
  en: { ...webEn, ui: uiEn },
  ar: { ...webAr, ui: uiAr },
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: messages[locale], timeZone: 'UTC' };
});
