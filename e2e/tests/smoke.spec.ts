import { expect, test } from '@playwright/test';

test.describe('site shell', () => {
  test('English lives at / and reads left to right', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Arabic lives at /ar and reads right to left', async ({ page }) => {
    const response = await page.goto('/ar');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('pages declare canonical and hreflang alternates', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/ar$/);
    for (const lang of ['en', 'ar', 'x-default']) {
      await expect(page.locator(`link[rel=alternate][hreflang="${lang}"]`)).toHaveCount(1);
    }
  });

  test('the language switch is a crawlable link to the same page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'العربية' }).click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('/en redirects to the unprefixed URL', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test('unknown pages return 404 in both languages', async ({ request }) => {
    expect((await request.get('/no-such-tool')).status()).toBe(404);
    expect((await request.get('/ar/no-such-tool')).status()).toBe(404);
  });

  test('sitemap lists both languages', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text();
    expect(body).toContain('hreflang="ar"');
    expect(body).toMatch(/<loc>[^<]*\/ar<\/loc>/);
  });

  test('staging is not indexable', async ({ page, request }) => {
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
    await page.goto('/');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });
});
