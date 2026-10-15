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

/** Two modes: "one" needs a page, "many" a count (a number option); each hides the other's. */
export const fakeModeTool = defineTool({
  id: 'fakeMode',
  slug: 'fake-mode-pdf',
  runtime: 'browser',
  category: 'organize',
  input: { accept: ['pdf'], minFiles: 1, maxFiles: 1, maxTotalBytes: 10 * MIB, ordered: false },
  output: { kind: 'pdf', defaultBaseName: 'picked', zipBaseName: 'parts' },
  options: z
    .object({
      mode: z.enum(['one', 'many']).default('one'),
      page: z.string().default(''),
      count: z.int().min(1).max(9).default(2),
      outputName: z.string().max(100).default(''),
    })
    .superRefine((o, ctx) => {
      if (o.mode === 'one' && !/^\d+$/.test(o.page)) {
        ctx.addIssue({ code: 'custom', path: ['page'], message: 'digits only' });
      }
    }),
  conditionalOptions: { page: { mode: ['one'] }, count: { mode: ['many'] } },
  related: [],
  icon: 'files',
});

const fakeModeCopy = {
  en: {
    action: 'Cut',
    options: {
      mode: { label: 'Mode', choices: { one: 'One page', many: 'Several files' } },
      page: { label: 'Page', required: 'Enter a page.', invalid: 'Digits only.' },
      count: { label: 'Pages per file', required: 'Enter a count.', invalid: 'From 1 to 9.' },
      outputName: { label: 'File name (optional)' },
    },
  },
  ar: {
    action: 'قص',
    options: {
      mode: { label: 'الطريقة', choices: { one: 'صفحة واحدة', many: 'عدة ملفات' } },
      page: { label: 'الصفحة', required: 'أدخل رقم صفحة.', invalid: 'أرقام فقط.' },
      count: { label: 'صفحات لكل ملف', required: 'أدخل العدد.', invalid: 'من 1 إلى 9.' },
      outputName: { label: 'اسم الملف (اختياري)' },
    },
  },
};

const fakeCopy = {
  en: {
    fakeMode: fakeModeCopy.en,
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
    fakeMode: fakeModeCopy.ar,
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
