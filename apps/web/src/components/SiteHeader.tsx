import { BRAND } from '@repo/ui/brand';
import { FileStack } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '../i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

export async function SiteHeader() {
  const t = await getTranslations('nav');
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <FileStack aria-hidden className="size-6 text-primary" />
          {BRAND.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-primary">
            {t('allTools')}
          </Link>
          <LocaleSwitcher label={t('switchLanguage')} title={t('switchLanguageLabel')} />
        </nav>
      </div>
    </header>
  );
}
