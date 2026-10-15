import { PDF_ERROR_CODES, webTools } from '@repo/pdf-client';
import uiAr from '@repo/ui/messages/ar.json';
import uiEn from '@repo/ui/messages/en.json';
import { describe, expect, it } from 'vitest';
import webAr from '../messages/ar.json';
import webEn from '../messages/en.json';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Every key path, with arrays reduced to their length, so en and ar must match exactly. */
function shape(value: Json, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return [`${prefix}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${prefix}[${i}]`))];
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

const REQUIRED_TOOL_COPY = [
  'metaTitle',
  'metaDescription',
  'h1',
  'lead',
  'cardText',
  'howTo',
  'faq',
];

describe('message files', () => {
  it('web copy has the same keys in English and Arabic', () => {
    expect(shape(webAr as Json)).toEqual(shape(webEn as Json));
  });

  it('UI strings have the same keys in English and Arabic', () => {
    expect(shape(uiAr as Json)).toEqual(shape(uiEn as Json));
  });

  it('has no empty strings', () => {
    for (const [name, messages] of Object.entries({ webEn, webAr, uiEn, uiAr })) {
      const empty = JSON.stringify(messages).match(/"[^"]+":""/g);
      expect(empty, name).toBeNull();
    }
  });

  it('translates every error code', () => {
    for (const code of PDF_ERROR_CODES) {
      expect(uiEn.errors).toHaveProperty(code);
      expect(uiAr.errors).toHaveProperty(code);
    }
  });

  it.each(webTools().map((t) => [t.id] as const))('has complete copy for %s', (id) => {
    const webTools = webEn.tools as Record<string, Record<string, Json>>;
    const uiTools = uiEn.tools as Record<string, Record<string, Json>>;
    for (const key of REQUIRED_TOOL_COPY) expect(webTools[id], `tools.${id}`).toHaveProperty(key);
    expect(uiTools[id], `ui.tools.${id}`).toHaveProperty('action');
  });
});
