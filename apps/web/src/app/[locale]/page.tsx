import { type ToolCategory, type ToolDefinition, webTools } from '@repo/pdf-client';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ToolIcon } from '../../components/ToolIcon';
import { Link } from '../../i18n/navigation';
import type { Locale } from '../../i18n/routing';
import { alternatesFor } from '../../lib/seo';

const CATEGORY_ORDER: readonly ToolCategory[] = [
  'organize',
  'optimize',
  'convert',
  'edit',
  'security',
];

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: { absolute: t('metaTitle') },
    description: t('metaDescription'),
    alternates: alternatesFor('/', locale),
  };
}

export default async function HomePage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tCategory = await getTranslations('categories');
  const tTools = await getTranslations('tools');

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    tools: webTools().filter((tool) => tool.category === category),
  })).filter((group) => group.tools.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('h1')}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t('lead')}</p>

      {groups.length === 0 && <p className="mt-10 text-muted-foreground">{t('empty')}</p>}

      {groups.map(({ category, tools }) => (
        <section key={category} className="mt-10" aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`} className="text-xl font-semibold">
            {tCategory(category)}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool: ToolDefinition) => (
              <li key={tool.id}>
                <Link
                  href={`/${tool.slug}`}
                  className="flex h-full gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary"
                >
                  <ToolIcon name={tool.icon} className="size-6 shrink-0 text-primary" />
                  <span>
                    <span className="block font-semibold">{tTools(`${tool.id}.h1`)}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {tTools(`${tool.id}.cardText`)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
