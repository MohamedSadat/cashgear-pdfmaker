import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { merge } from '../src/engine/merge';
import { PdfClientError } from '../src/errors';
import { getToolById } from '../src/registry/index';
import { runTool } from '../src/worker/client';
import { corpusBytes, manifest } from './helpers/corpus';

const A = 'pdf/basic/a-3p-a4.pdf';
const B = 'pdf/basic/b-2p-letter.pdf';
const C = 'pdf/basic/c-1p-a5-rot90.pdf';
const ARABIC = 'pdf/text/arabic-2p.pdf';

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}

async function failure(promise: Promise<unknown>): Promise<PdfClientError> {
  const error = await promise.then(
    () => {
      throw new Error('expected a failure');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PdfClientError);
  return error as PdfClientError;
}

describe('merge', () => {
  it('is registered as a browser tool', () => {
    const tool = getToolById('merge');
    expect(tool?.slug).toBe('merge-pdf');
    expect(tool?.runtime).toBe('browser');
    expect(tool?.input.minFiles).toBe(2);
  });

  it('concatenates pages in input order', async () => {
    const out = await merge([corpusBytes(A), corpusBytes(B)], { outputName: '' });
    expect(await pageWidths(out)).toEqual([595, 595, 595, 612, 612]);
    const reversed = await merge([corpusBytes(B), corpusBytes(A)], { outputName: '' });
    expect(await pageWidths(reversed)).toEqual([612, 612, 595, 595, 595]);
  });

  it('keeps page rotation', async () => {
    const out = await merge([corpusBytes(A), corpusBytes(C)], { outputName: '' });
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(3).getRotation().angle).toBe(90);
  });

  it('writes the producer into the metadata', async () => {
    const out = await merge(
      [corpusBytes(A), corpusBytes(B)],
      { outputName: '' },
      {
        producer: 'Test Brand',
      },
    );
    const doc = await PDFDocument.load(out, { updateMetadata: false });
    expect(doc.getProducer()).toBe('Test Brand');
    expect(doc.getCreator()).toBe('Test Brand');
  });

  it('reports progress per file, then saving', async () => {
    const seen: string[] = [];
    await merge(
      [corpusBytes(A), corpusBytes(B)],
      { outputName: '' },
      {
        onProgress: (p) => seen.push(`${p.phase}:${p.current}/${p.total}`),
      },
    );
    expect(seen).toEqual(['process:1/2', 'process:2/2', 'save:2/2']);
  });

  it.each(['pdf/edge/encrypted-user-pw.pdf', 'pdf/edge/encrypted-owner-only.pdf'])(
    'rejects %s as ENCRYPTED with its index',
    async (rel) => {
      const error = await failure(merge([corpusBytes(A), corpusBytes(rel)], { outputName: '' }));
      expect(error.code).toBe('ENCRYPTED');
      expect(error.fileIndex).toBe(1);
    },
  );

  it('rejects a file with no pages as EMPTY_DOCUMENT', async () => {
    const error = await failure(
      merge([corpusBytes('pdf/edge/zero-pages.pdf'), corpusBytes(A)], { outputName: '' }),
    );
    expect(error.code).toBe('EMPTY_DOCUMENT');
    expect(error.fileIndex).toBe(0);
  });

  it.each(['pdf/edge/garbage-after-header.pdf', 'pdf/edge/not-a-pdf.pdf'])(
    'rejects %s as INVALID_PDF',
    async (rel) => {
      const error = await failure(merge([corpusBytes(A), corpusBytes(rel)], { outputName: '' }));
      expect(error.code).toBe('INVALID_PDF');
      expect(error.fileIndex).toBe(1);
    },
  );

  it.skipIf(!manifest[ARABIC])('keeps the embedded fonts of Arabic text', async () => {
    const out = await merge([corpusBytes(ARABIC), corpusBytes(A)], { outputName: '' });
    const doc = await PDFDocument.load(out);
    const resources = doc.getPage(0).node.Resources();
    expect(resources?.toString()).toContain('/Font');
  });

  it('merges 1,200 pages quickly', async () => {
    const started = performance.now();
    const out = await merge([corpusBytes('pdf/large/1200-pages.pdf'), corpusBytes(B)], {
      outputName: '',
    });
    expect(performance.now() - started).toBeLessThan(10_000);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1202);
  });

  it('stops with ABORTED when the signal fires', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await failure(
      merge([corpusBytes(A), corpusBytes(B)], { outputName: '' }, { signal: controller.signal }),
    );
    expect(error.code).toBe('ABORTED');
  });

  it('runs through the runner (main-thread fallback in Node)', async () => {
    const files = [new Blob([corpusBytes(A)]), new Blob([corpusBytes(B)])];
    const out = await runTool('merge', files, {});
    expect(out.kind).toBe('pdf');
    expect(await pageWidths(out.bytes)).toHaveLength(5);
  });

  it('rejects options that fail the schema', async () => {
    const files = [new Blob([corpusBytes(A)]), new Blob([corpusBytes(B)])];
    const error = await failure(runTool('merge', files, { outputName: 'x'.repeat(500) }));
    expect(error.code).toBe('UNKNOWN');
  });
});
