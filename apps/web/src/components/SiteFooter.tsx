import { BRAND } from '@repo/ui/brand';
import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function SiteFooter() {
  const t = await getTranslations('site');
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-4 text-success" />
          {t('footer')}
        </p>
        <p>{BRAND.name}</p>
      </div>
    </footer>
  );
}
