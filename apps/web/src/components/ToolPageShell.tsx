import { type ToolDefinition, getToolById } from '@repo/pdf-client';
import { formatMegabytes } from '@repo/ui/lib/format';
import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '../i18n/navigation';
import type { Locale } from '../i18n/routing';
import { localizedPath } from '../lib/seo';
import { absoluteUrl } from '../lib/site';
import { JsonLd } from './JsonLd';
import { ToolIcon } from './ToolIcon';
import { ToolMount } from './ToolMount';

/**
 * Every tool page: H1 and lead, the tool above the fold, then how-to, FAQ and related tools.
 * Everything except the tool itself is server-rendered HTML with no JavaScript.
 */
export async function ToolPageShell({ tool, locale }: { tool: ToolDefinition; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: `tools.${tool.id}` });
  const tPage = await getTranslations({ locale, namespace: 'toolPage' });
  const tTools = await getTranslations({ locale, namespace: 'tools' });

  const params = {
    maxFiles: tool.input.maxFiles,
    maxSize: formatMegabytes(tool.input.maxTotalBytes, locale),
  };
  const steps = t.raw('howTo') as string[];
  const faq = (t.raw('faq') as unknown[]).map((_, i) => ({
    q: t(`faq.${i}.q`, params),
    a: t(`faq.${i}.a`, params),
  }));
  const related = tool.related
    .map((id) => getToolById(id))
    .filter((r): r is ToolDefinition => r !== undefined);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('h1')}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{t('lead')}</p>
      {tool.runtime === 'browser' && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          <ShieldCheck aria-hidden className="size-4" />
          {tPage('privacy')}
        </p>
      )}

      <div className="mt-8">
        <ToolMount toolId={tool.id} input={tool.input} />
      </div>

      <section className="mt-14" aria-labelledby="how-to">
        <h2 id="how-to" className="text-xl font-semibold">
          {tPage('howTo')}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 ps-6">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-semibold">
          {tPage('faq')}
        </h2>
        <div className="mt-4 divide-y rounded-xl border">
          {faq.map(({ q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related">
          <h2 id="related" className="text-xl font-semibold">
            {tPage('related')}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/${r.slug}`}
                  className="flex items-center gap-3 rounded-lg border p-4 hover:border-primary"
                >
                  <ToolIcon name={r.icon} className="size-5 text-primary" />
                  {tTools(`${r.id}.h1`)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: t('h1'),
              description: t('metaDescription'),
              url: absoluteUrl(localizedPath(`/${tool.slug}`, locale)),
              inLanguage: locale,
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            },
            {
              '@type': 'FAQPage',
              mainEntity: faq.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
              })),
            },
          ],
        }}
      />
    </div>
  );
}
