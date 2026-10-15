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

/** One file in, with a required option (no default) the user must fill in before running. */
export const fakeSingleTool = defineTool({
  id: 'fakeSingle',
  slug: 'fake-single-pdf',
  runtime: 'browser',
  category: 'organize',
  input: { accept: ['pdf'], minFiles: 1, maxFiles: 1, maxTotalBytes: 10 * MIB, ordered: false },
  output: { kind: 'pdf', defaultBaseName: 'picked' },
  options: z.object({
    page: z.string().regex(/^\d+$/),
    outputName: z.string().max(100).default(''),
  }),
  related: [],
  icon: 'file',
});

const fakeCopy = {
  en: {
    fake: { action: 'Combine', options: { outputName: { label: 'File name (optional)' } } },
    fakeSingle: {
      action: 'Pick',
      options: {
        page: { label: 'Page', required: 'Enter a page.', invalid: 'Digits only.' },
        outputName: { label: 'File name (optional)' },
      },
    },
  },
  ar: {
    fake: { action: 'اجمع', options: { outputName: { label: 'اسم الملف (اختياري)' } } },
    fakeSingle: {
      action: 'اختر',
      options: {
        page: { label: 'الصفحة', required: 'أدخل رقم صفحة.', invalid: 'أرقام فقط.' },
        outputName: { label: 'اسم الملف (اختياري)' },
      },
    },
  },
};

export function renderWithIntl(ui: ReactElement, locale: 'en' | 'ar' = 'en') {
  const base = locale === 'en' ? en : ar;
  const messages = { ui: { ...base, tools: fakeCopy[locale] } };
  return render(
    <IntlProvider locale={locale} messages={messages}>
      {ui}
    </IntlProvider>,
  );
}

export const pdfFile = (name: string, size = 1000) =>
  new File(['%PDF-1.7\n', new Uint8Array(size)], name, { type: 'application/pdf' });
