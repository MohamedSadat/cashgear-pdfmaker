import { PDFDocument } from '@cantoo/pdf-lib';
import { expect, type Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const testdata = (rel: string) => fileURLToPath(new URL(`../../testdata/${rel}`, import.meta.url));
const uiMessages = (locale: string) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../packages/ui/src/messages/${locale}.json`, import.meta.url)),
      'utf8',
    ),
  );

const A = testdata('pdf/basic/a-3p-a4.pdf'); // 3 A4 pages, 595 pt wide
const B = testdata('pdf/basic/b-2p-letter.pdf'); // 2 Letter pages, 612 pt wide

/** Records every request that could carry file bytes off the device. */
function watchUploads(page: Page): string[] {
  const sent: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method()))
      sent.push(`${request.method()} ${request.url()}`);
  });
  return sent;
}

for (const locale of ['en', 'ar'] as const) {
  test(`merges two PDFs in the chosen order (${locale})`, async ({ page }) => {
    const t = uiMessages(locale);
    const sent = watchUploads(page);
    await page.goto(locale === 'en' ? '/merge-pdf' : '/ar/merge-pdf');
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'en' ? 'ltr' : 'rtl');

    await page.locator('input[type=file]').setInputFiles([A, B]);
    const rows = page.getByTestId('file-row');
    await expect(rows).toHaveCount(2);

    // Put the Letter file first.
    await rows.nth(1).getByRole('button', { name: t.fileList.moveUp }).click();
    await expect(rows.nth(0)).toContainText('b-2p-letter.pdf');

    // The engine must run in a Web Worker, not the main-thread fallback.
    const workerPromise = page.waitForEvent('worker');
    await page.getByRole('button', { name: t.tools.merge.action }).click();
    await workerPromise;
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: t.result.download }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('merged.pdf');
    const merged = await PDFDocument.load(readFileSync(await download.path()));
    expect(merged.getPageCount()).toBe(5);
    expect(Math.round(merged.getPage(0).getWidth())).toBe(612);
    expect(Math.round(merged.getPage(2).getWidth())).toBe(595);

    expect(sent, 'browser tools must not upload anything').toEqual([]);
  });
}

test('names the encrypted file that blocked the merge', async ({ page }) => {
  const t = uiMessages('en');
  await page.goto('/merge-pdf');
  await page
    .locator('input[type=file]')
    .setInputFiles([A, testdata('pdf/edge/encrypted-user-pw.pdf')]);
  await page.getByRole('button', { name: t.tools.merge.action }).click();
  // Next.js renders its own (empty) route announcer with role=alert, so pick ours by its text.
  const alert = page.getByRole('alert').filter({ hasText: 'password-protected' });
  await expect(alert).toContainText('encrypted-user-pw.pdf');
  await expect(page.getByTestId('file-row').nth(1)).toHaveClass(/border-destructive/);
});

test('uses the typed file name for the download', async ({ page }) => {
  const t = uiMessages('en');
  await page.goto('/merge-pdf');
  await page.locator('input[type=file]').setInputFiles([A, B]);
  await page.getByLabel(t.tools.merge.options.outputName.label).fill('Quarterly report');
  await page.getByRole('button', { name: t.tools.merge.action }).click();
  await expect(page.getByRole('link', { name: t.result.download })).toHaveAttribute(
    'download',
    'Quarterly report.pdf',
  );
});

test('the tool page is static, crawlable and links its alternates', async ({ page }) => {
  await page.goto('/merge-pdf');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/merge-pdf$/);
  await expect(page.locator('link[rel=alternate][hreflang="ar"]')).toHaveAttribute(
    'href',
    /\/ar\/merge-pdf$/,
  );
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.join('')).toContain('FAQPage');
});
