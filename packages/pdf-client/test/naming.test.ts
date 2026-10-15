import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_NAME_LENGTH,
  outputBaseName,
  outputFileName,
  partFileName,
  sanitizeBaseName,
} from '../src/naming';

const pdfOutput = { kind: 'pdf', defaultBaseName: 'merged' } as const;
const splitOutput = {
  kind: 'pdf',
  defaultBaseName: 'extracted-pages',
  zipBaseName: 'split',
} as const;

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

describe('outputFileName for another kind than the usual one', () => {
  it('names a ZIP with the ZIP default, or the usual default when there is none', () => {
    expect(outputFileName(splitOutput, '', 'zip')).toBe('split.zip');
    expect(outputFileName(splitOutput, '', 'pdf')).toBe('extracted-pages.pdf');
    expect(outputFileName(pdfOutput, '', 'zip')).toBe('merged.zip');
  });

  it('drops a typed .zip or .pdf extension before adding .zip', () => {
    expect(outputFileName(splitOutput, 'Chapters', 'zip')).toBe('Chapters.zip');
    expect(outputFileName(splitOutput, 'Chapters.ZIP', 'zip')).toBe('Chapters.zip');
    expect(outputFileName(splitOutput, 'Chapters.pdf', 'zip')).toBe('Chapters.zip');
    expect(outputFileName(splitOutput, 'فصول', 'zip')).toBe('فصول.zip');
  });

  it('cleans up what is left once the extension is gone', () => {
    expect(outputFileName(splitOutput, 'report..pdf', 'zip')).toBe('report.zip');
    expect(outputFileName(splitOutput, '.pdf', 'zip')).toBe('pdf.zip');
  });
});

describe('outputBaseName', () => {
  it('is the file name without its extension', () => {
    expect(outputBaseName(splitOutput, 'Chapters.pdf', 'zip')).toBe('Chapters');
    expect(outputBaseName(splitOutput, '', 'zip')).toBe('split');
    expect(outputBaseName(splitOutput)).toBe('extracted-pages');
  });
});

describe('partFileName', () => {
  it('numbers files from 1', () => {
    expect(partFileName('split', 0, 3, 'pdf')).toBe('split-1.pdf');
    expect(partFileName('split', 2, 3, 'pdf')).toBe('split-3.pdf');
  });

  it('pads the number to the digits of the count so names sort in order', () => {
    expect(partFileName('split', 0, 12, 'pdf')).toBe('split-01.pdf');
    expect(partFileName('split', 11, 12, 'pdf')).toBe('split-12.pdf');
    expect(partFileName('split', 6, 1200, 'pdf')).toBe('split-0007.pdf');
  });

  it('keeps an Arabic base name', () => {
    expect(partFileName('فصول', 1, 2, 'pdf')).toBe('فصول-2.pdf');
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
