import { describe, expect, it } from 'vitest';
import { MAX_FILE_NAME_LENGTH, outputFileName, sanitizeBaseName } from '../src/naming';

const pdfOutput = { kind: 'pdf', defaultBaseName: 'merged' } as const;

describe('outputFileName', () => {
  it('falls back to the default base name', () => {
    expect(outputFileName(pdfOutput)).toBe('merged.pdf');
    expect(outputFileName(pdfOutput, '   ')).toBe('merged.pdf');
  });

  it('adds the extension once, whatever its case', () => {
    expect(outputFileName(pdfOutput, 'report')).toBe('report.pdf');
    expect(outputFileName(pdfOutput, 'report.PDF')).toBe('report.pdf');
  });

  it('keeps Arabic names as typed', () => {
    expect(outputFileName(pdfOutput, 'تقرير الربع الثالث')).toBe('تقرير الربع الثالث.pdf');
  });
});

describe('sanitizeBaseName', () => {
  it('replaces path separators and reserved characters', () => {
    expect(sanitizeBaseName('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('strips bidi overrides used to disguise extensions', () => {
    expect(sanitizeBaseName('invoice\u202efdp.exe')).toBe('invoicefdp.exe');
    expect(sanitizeBaseName('\u2066name\u2069')).toBe('name');
  });

  it('strips control characters and trims dots and spaces', () => {
    expect(sanitizeBaseName('  ..name\u0000\u0007..  ')).toBe('name');
  });

  it('prefixes Windows reserved device names', () => {
    expect(sanitizeBaseName('CON')).toBe('_CON');
    expect(sanitizeBaseName('lpt1')).toBe('_lpt1');
    expect(sanitizeBaseName('console')).toBe('console');
  });

  it('caps length by code points, not UTF-16 units', () => {
    const long = '😀'.repeat(150);
    expect(Array.from(sanitizeBaseName(long))).toHaveLength(MAX_FILE_NAME_LENGTH);
  });
});
