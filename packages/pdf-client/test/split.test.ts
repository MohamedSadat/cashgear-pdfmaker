import { PDFDocument } from '@cantoo/pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { split } from '../src/engine/split';
import { PdfClientError } from '../src/errors';
import { getToolById } from '../src/registry/index';
import { runTool } from '../src/worker/client';
import { corpusBytes, manifest } from './helpers/corpus';

const A = 'pdf/basic/a-3p-a4.pdf';
const B = 'pdf/basic/b-2p-letter.pdf';
const C = 'pdf/basic/c-1p-a5-rot90.pdf';
const ARABIC = 'pdf/text/arabic-2p.pdf';

/** A + B + C: six pages whose widths tell them apart (595 x3, 612 x2, 420 rotated). */
let mixed: Uint8Array<ArrayBuffer>;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  for (const rel of [A, B, C]) {
    const source = await PDFDocument.load(corpusBytes(rel));
    for (const page of await doc.copyPages(source, source.getPageIndices())) doc.addPage(page);
  }
  mixed = (await doc.save()) as Uint8Array<ArrayBuffer>;
});

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

const options = (pages: string) => ({ pages, outputName: '' });

describe('split', () => {
  it('is registered as a single-file browser tool, related to merge both ways', () => {
    const tool = getToolById('split');
    expect(tool?.slug).toBe('split-pdf');
    expect(tool?.runtime).toBe('browser');
    expect(tool?.input).toMatchObject({ minFiles: 1, maxFiles: 1, ordered: false });
    expect(tool?.related).toContain('merge');
    expect(getToolById('merge')?.related).toContain('split');
  });

  it('extracts the chosen pages in document order', async () => {
    expect(await pageWidths(await split([mixed], options('4-5, 1')))).toEqual([595, 612, 612]);
    expect(await pageWidths(await split([mixed], options('6, 4, 4')))).toEqual([612, 420]);
  });

  it('runs an open range to the last page', async () => {
    expect(await pageWidths(await split([mixed], options('4-')))).toEqual([612, 612, 420]);
  });

  it('accepts Arabic-Indic digits', async () => {
    expect(await pageWidths(await split([mixed], options('٣-٤')))).toEqual([595, 612]);
  });

  it('keeps page rotation', async () => {
    const doc = await PDFDocument.load(await split([mixed], options('6')));
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it('writes the producer into the metadata', async () => {
    const out = await split([corpusBytes(A)], options('1'), { producer: 'Test Brand' });
    const doc = await PDFDocument.load(out, { updateMetadata: false });
    expect(doc.getProducer()).toBe('Test Brand');
    expect(doc.getCreator()).toBe('Test Brand');
  });

  it('reports progress, then saving', async () => {
    const seen: string[] = [];
    await split([corpusBytes(A)], options('1-2'), {
      onProgress: (p) => seen.push(`${p.phase}:${p.current}/${p.total}`),
    });
    expect(seen).toEqual(['process:1/1', 'save:1/1']);
  });

  it('rejects a page past the end as PAGE_OUT_OF_RANGE', async () => {
    const error = await failure(split([corpusBytes(A)], options('2-9')));
    expect(error.code).toBe('PAGE_OUT_OF_RANGE');
    expect(error.fileIndex).toBe(0);
  });

  it('rejects a malformed page list as INVALID_PAGE_RANGE', async () => {
    const error = await failure(split([corpusBytes(A)], options('3-1')));
    expect(error.code).toBe('INVALID_PAGE_RANGE');
  });

  it('takes exactly one file', async () => {
    expect((await failure(split([], options('1')))).code).toBe('TOO_FEW_FILES');
    const two = split([corpusBytes(A), corpusBytes(B)], options('1'));
    expect((await failure(two)).code).toBe('TOO_MANY_FILES');
  });

  it.each(['pdf/edge/encrypted-user-pw.pdf', 'pdf/edge/encrypted-owner-only.pdf'])(
    'rejects %s as ENCRYPTED',
    async (rel) => {
      const error = await failure(split([corpusBytes(rel)], options('1')));
      expect(error.code).toBe('ENCRYPTED');
      expect(error.fileIndex).toBe(0);
    },
  );

  it('rejects a file with no pages as EMPTY_DOCUMENT', async () => {
    const error = await failure(split([corpusBytes('pdf/edge/zero-pages.pdf')], options('1')));
    expect(error.code).toBe('EMPTY_DOCUMENT');
    expect(error.fileIndex).toBe(0);
  });

  it.each(['pdf/edge/garbage-after-header.pdf', 'pdf/edge/not-a-pdf.pdf'])(
    'rejects %s as INVALID_PDF',
    async (rel) => {
      const error = await failure(split([corpusBytes(rel)], options('1')));
      expect(error.code).toBe('INVALID_PDF');
      expect(error.fileIndex).toBe(0);
    },
  );

  it.skipIf(!manifest[ARABIC])('keeps the embedded fonts of Arabic text', async () => {
    const doc = await PDFDocument.load(await split([corpusBytes(ARABIC)], options('2')));
    expect(doc.getPage(0).node.Resources()?.toString()).toContain('/Font');
  });

  it('extracts 1,000 of 1,200 pages quickly', async () => {
    const started = performance.now();
    const out = await split([corpusBytes('pdf/large/1200-pages.pdf')], options('101-1100'));
    expect(performance.now() - started).toBeLessThan(10_000);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1000);
  });

  it('stops with ABORTED when the signal fires', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await failure(
      split([corpusBytes(A)], options('1'), { signal: controller.signal }),
    );
    expect(error.code).toBe('ABORTED');
  });

  it('runs through the runner (main-thread fallback in Node)', async () => {
    const out = await runTool('split', [new Blob([mixed])], { pages: '2-3' });
    expect(await pageWidths(out)).toEqual([595, 595]);
  });

  it.each([{}, { pages: '' }, { pages: 'abc' }])(
    'rejects options that fail the schema: %j',
    async (bad) => {
      const error = await failure(runTool('split', [new Blob([mixed])], bad));
      expect(error.code).toBe('UNKNOWN');
    },
  );
});
