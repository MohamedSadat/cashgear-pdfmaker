import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const testdata = (rel: string) =>
  fileURLToPath(new URL(`../../testdata/${rel}`, import.meta.url));

export const uiMessages = (locale: string) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../packages/ui/src/messages/${locale}.json`, import.meta.url)),
      'utf8',
    ),
  );

/** Records every request that could carry file bytes off the device. */
export function watchUploads(page: Page): string[] {
  const sent: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method()))
      sent.push(`${request.method()} ${request.url()}`);
  });
  return sent;
}
