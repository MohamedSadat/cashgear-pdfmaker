import { getTranslations } from 'next-intl/server';
import { Link } from '../../i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <title>{t('metaTitle')}</title>
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <Link href="/" className="text-primary underline">
        {t('back')}
      </Link>
    </div>
  );
}
