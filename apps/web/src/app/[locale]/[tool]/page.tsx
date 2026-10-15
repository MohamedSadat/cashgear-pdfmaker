import { getToolBySlug, webTools } from '@repo/pdf-client';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ToolPageShell } from '../../../components/ToolPageShell';
import type { Locale } from '../../../i18n/routing';
import { alternatesFor } from '../../../lib/seo';

// One static page per browser tool per locale; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return webTools().map((tool) => ({ tool: tool.slug }));
}

interface PageProps {
  params: Promise<{ locale: string; tool: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, tool: slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};
  const t = await getTranslations({ locale, namespace: `tools.${tool.id}` });
  return {
    title: { absolute: t('metaTitle') },
    description: t('metaDescription'),
    alternates: alternatesFor(`/${tool.slug}`, locale as Locale),
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { locale, tool: slug } = await params;
  setRequestLocale(locale);
  const tool = getToolBySlug(slug);
  if (!tool || tool.runtime === 'server') notFound();
  return <ToolPageShell tool={tool} locale={locale as Locale} />;
}
