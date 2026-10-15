import { MIB, defineTool } from '@repo/pdf-client';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { z } from 'zod';
import { IntlProvider } from '../src/lib/i18n';
import ar from '../src/messages/ar.json';
import en from '../src/messages/en.json';

export const fakeTool = defineTool({
  id: 'fake',
  slug: 'fake-pdf',
  runtime: 'browser',
  category: 'organize',
  input: { accept: ['pdf'], minFiles: 2, maxFiles: 5, maxTotalBytes: 10 * MIB, ordered: true },
  output: { kind: 'pdf', defaultBaseName: 'combined' },
  options: z.object({ outputName: z.string().max(100).default('') }),
  related: [],
  icon: 'files',
});

const fakeCopy = {
  en: { action: 'Combine', options: { outputName: { label: 'File name (optional)' } } },
  ar: { action: 'اجمع', options: { outputName: { label: 'اسم الملف (اختياري)' } } },
};

export function renderWithIntl(ui: ReactElement, locale: 'en' | 'ar' = 'en') {
  const base = locale === 'en' ? en : ar;
  const messages = { ui: { ...base, tools: { fake: fakeCopy[locale] } } };
  return render(
    <IntlProvider locale={locale} messages={messages}>
      {ui}
    </IntlProvider>,
  );
}

export const pdfFile = (name: string, size = 1000) =>
  new File(['%PDF-1.7\n', new Uint8Array(size)], name, { type: 'application/pdf' });
