import { PDFDocument } from '@cantoo/pdf-lib';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { testdata, uiMessages, watchUploads } from './helpers';

const A = testdata('pdf/basic/a-3p-a4.pdf'); // 3 A4 pages, 595 pt wide
const B = testdata('pdf/basic/b-2p-letter.pdf'); // 2 Letter pages, 612 pt wide

/**
 * A + B in one file: pages 1-3 are 595 pt wide and 4-5 are 612, so the page widths of the output
 * show which pages were kept.
 */
async function mixedPdf() {
  const doc = await PDFDocument.create();
  for (const path of [A, B]) {
    const source = await PDFDocument.load(readFileSync(path));
    for (const page of await doc.copyPages(source, source.getPageIndices())) doc.addPage(page);
  }
  return { name: 'mixed.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) };
}

for (const locale of ['en', 'ar'] as const) {
  test(`extracts the chosen pages (${locale})`, async ({ page }) => {
    const t = uiMessages(locale);
    const sent = watchUploads(page);
    await page.goto(locale === 'en' ? '/split-pdf' : '/ar/split-pdf');
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'en' ? 'ltr' : 'rtl');

    await page.locator('input[type=file]').setInputFiles(await mixedPdf());
    await expect(page.getByTestId('file-row')).toHaveCount(1);
    // One file only: no "Add more files" button.
    await expect(page.getByText(t.dropzone.addMore)).toHaveCount(0);

    const action = page.getByRole('button', { name: t.tools.split.action });
    await expect(action).toBeDisabled();
    await expect(page.getByText(t.tools.split.options.pages.required)).toBeVisible();
    // Arabic users may type Arabic-Indic digits.
    await page.getByLabel(t.tools.split.options.pages.label).fill(locale === 'en' ? '3-4' : '٣-٤');

    // The engine must run in a Web Worker, not the main-thread fallback.
    const workerPromise = page.waitForEvent('worker');
    await action.click();
    await workerPromise;
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: t.result.download }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('extracted-pages.pdf');
    const out = await PDFDocument.load(readFileSync(await download.path()));
    expect(out.getPages().map((p) => Math.round(p.getWidth()))).toEqual([595, 612]);

    expect(sent, 'browser tools must not upload anything').toEqual([]);
  });
}

test('explains a malformed page list and keeps the action disabled', async ({ page }) => {
  const t = uiMessages('en');
  await page.goto('/split-pdf');
  await page.locator('input[type=file]').setInputFiles(A);
  const field = page.getByLabel(t.tools.split.options.pages.label);
  const action = page.getByRole('button', { name: t.tools.split.action });

  await field.fill('3-1');
  await expect(page.getByText(t.tools.split.options.pages.invalid)).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(action).toBeDisabled();

  await field.fill('1-2');
  await expect(page.getByText(t.tools.split.options.pages.invalid)).toHaveCount(0);
  await expect(action).toBeEnabled();
});

test('names the file when a page is past its end', async ({ page }) => {
  const t = uiMessages('en');
  await page.goto('/split-pdf');
  await page.locator('input[type=file]').setInputFiles(A);
  await page.getByLabel(t.tools.split.options.pages.label).fill('2-9');
  await page.getByRole('button', { name: t.tools.split.action }).click();
  // Next.js renders its own (empty) route announcer with role=alert, so pick ours by its text.
  const alert = page.getByRole('alert').filter({ hasText: 'a-3p-a4.pdf' });
  await expect(alert).toContainText('page numbers');
  await expect(page.getByTestId('file-row')).toHaveClass(/border-destructive/);
});

test('uses the typed file name for the download', async ({ page }) => {
  const t = uiMessages('en');
  await page.goto('/split-pdf');
  await page.locator('input[type=file]').setInputFiles(A);
  await page.getByLabel(t.tools.split.options.pages.label).fill('1');
  await page.getByLabel(t.tools.split.options.outputName.label).fill('Cover page');
  await page.getByRole('button', { name: t.tools.split.action }).click();
  await expect(page.getByRole('link', { name: t.result.download })).toHaveAttribute(
    'download',
    'Cover page.pdf',
  );
});

test('split and merge pages link to each other', async ({ page }) => {
  await page.goto('/split-pdf');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/split-pdf$/);
  const related = page.locator('section[aria-labelledby=related]');
  await expect(related.locator('a[href$="/merge-pdf"]')).toHaveCount(1);

  await page.goto('/ar/merge-pdf');
  await expect(related.locator('a[href$="/ar/split-pdf"]')).toHaveCount(1);
});
