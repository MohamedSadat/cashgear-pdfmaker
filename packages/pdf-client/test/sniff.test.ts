import { describe, expect, it } from 'vitest';
import { acceptAttribute, sniffBytes, sniffFile } from '../src/sniff';

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

describe('sniffBytes', () => {
  it('detects a PDF header at the start', () => {
    expect(sniffBytes(ascii('%PDF-1.7\n'))).toBe('pdf');
  });

  it('detects a PDF header after leading junk within 1024 bytes', () => {
    const head = new Uint8Array(1024);
    head.set(ascii('%PDF-1.4'), 900);
    expect(sniffBytes(head)).toBe('pdf');
  });

  it('ignores a PDF header past 1024 bytes', () => {
    const head = new Uint8Array(2048);
    head.set(ascii('%PDF-1.4'), 1500);
    expect(sniffBytes(head)).toBeNull();
  });

  it('detects PNG and JPEG signatures', () => {
    expect(sniffBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('png');
    expect(sniffBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
  });

  it('uses the extension only to pick the OOXML kind of a real ZIP', () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0);
    expect(sniffBytes(zip, 'Report.DOCX')).toBe('docx');
    expect(sniffBytes(zip, 'sheet.xlsx')).toBe('xlsx');
    expect(sniffBytes(zip, 'archive.zip')).toBeNull();
    expect(sniffBytes(ascii('not a zip'), 'fake.docx')).toBeNull();
  });

  it('rejects text renamed to .pdf', () => {
    expect(sniffBytes(ascii('hello world'), 'evil.pdf')).toBeNull();
  });
});

describe('sniffFile', () => {
  it('reads only the head of a Blob', async () => {
    const blob = new Blob([ascii('%PDF-1.7\n'), new Uint8Array(5000)]);
    expect(await sniffFile(blob)).toBe('pdf');
  });
});

describe('acceptAttribute', () => {
  it('lists MIME types and extensions', () => {
    expect(acceptAttribute(['pdf'])).toBe('application/pdf,.pdf');
  });
});
