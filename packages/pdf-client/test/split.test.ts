import { PDFDocument } from '@cantoo/pdf-lib';
import { unzipSync } from 'fflate';
import { beforeAll, describe, expect, it } from 'vitest';
import { split } from '../src/engine/split';
import type { OperationOutput } from '../src/engine/types';
import { PdfClientError } from '../src/errors';
import { getToolById, initialOptions } from '../src/registry/index';
import type { SplitOptions } from '../src/registry/tools/split';
import { runTool } from '../src/worker/client';
import { corpusBytes, manifest } from './helpers/corpus';

const A = 'pdf/basic/a-3p-a4.pdf';
const B = 'pdf/basic/b-2p-letter.pdf';
const C = 'pdf/basic/c-1p-a5-rot90.pdf';
const ARABIC = 'pdf/text/arabic-2p.pdf';
const LARGE = 'pdf/large/1200-pages.pdf';

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

/** The one PDF an operation returned; fails when it returned a list. */
function single(output: OperationOutput): Uint8Array {
  if (Array.isArray(output)) throw new Error(`expected one PDF, got a list of ${output.length}`);
  return output;
}

/** The PDFs an operation returned; fails when it returned one PDF on its own. */
function several(output: OperationOutput): Uint8Array[] {
  if (!Array.isArray(output)) throw new Error('expected a list of PDFs, got one PDF');
  return output;
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}

const partWidths = (output: OperationOutput) => Promise.all(several(output).map(pageWidths));

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

const defaults = initialOptions(getToolById('split')!) as SplitOptions;
const options = (pages: string): SplitOptions => ({ ...defaults, mode: 'extract', pages });
const byRanges = (ranges: string): SplitOptions => ({ ...defaults, mode: 'ranges', ranges });
const byEvery = (every: number): SplitOptions => ({ ...defaults, mode: 'every', every });

/** Bytes 6-9 of a ZIP's first local file header: general purpose flags, compression method. */
function localHeader(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  return { flags: view.getUint16(6, true), method: view.getUint16(8, true) };
}

describe('split', () => {
  it('is registered as a single-file browser tool, related to merge both ways', () => {
    const tool = getToolById('split');
    expect(tool?.slug).toBe('split-pdf');
    expect(tool?.runtime).toBe('browser');
    expect(tool?.input).toMatchObject({ minFiles: 1, maxFiles: 1, ordered: false });
    expect(tool?.output).toMatchObject({ kind: 'pdf', zipBaseName: 'split' });
    expect(tool?.related).toContain('merge');
    expect(getToolById('merge')?.related).toContain('split');
  });

  it('extracts the chosen pages in document order', async () => {
    expect(await pageWidths(single(await split([mixed], options('4-5, 1'))))).toEqual([
      595, 612, 612,
    ]);
    expect(await pageWidths(single(await split([mixed], options('6, 4, 4'))))).toEqual([612, 420]);
  });

  it('runs an open range to the last page', async () => {
    expect(await pageWidths(single(await split([mixed], options('4-'))))).toEqual([612, 612, 420]);
  });

  it('accepts Arabic-Indic digits', async () => {
    expect(await pageWidths(single(await split([mixed], options('٣-٤'))))).toEqual([595, 612]);
  });

  it('keeps page rotation', async () => {
    const doc = await PDFDocument.load(single(await split([mixed], options('6'))));
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it('writes the producer into the metadata', async () => {
    const out = await split([corpusBytes(A)], options('1'), { producer: 'Test Brand' });
    const doc = await PDFDocument.load(single(out), { updateMetadata: false });
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
    const doc = await PDFDocument.load(single(await split([corpusBytes(ARABIC)], options('2'))));
    expect(doc.getPage(0).node.Resources()?.toString()).toContain('/Font');
  });

  it('extracts 1,000 of 1,200 pages quickly', async () => {
    const started = performance.now();
    const out = await split([corpusBytes(LARGE)], options('101-1100'));
    expect(performance.now() - started).toBeLessThan(10_000);
    expect((await PDFDocument.load(single(out))).getPageCount()).toBe(1000);
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
    expect(out.kind).toBe('pdf');
    expect(await pageWidths(out.bytes)).toEqual([595, 595]);
  });

  it.each([
    {},
    { pages: '' },
    { pages: 'abc' },
    { mode: 'ranges' },
    { mode: 'ranges', ranges: '3-1' },
    { mode: 'ranges', pages: '1-2' },
    { mode: 'every', every: 0 },
    { mode: 'every', every: 1.5 },
    { mode: 'every', every: '2' },
    { mode: 'pages', pages: '1' },
  ])('rejects options that fail the schema: %j', async (bad) => {
    const error = await failure(runTool('split', [new Blob([mixed])], bad));
    expect(error.code).toBe('UNKNOWN');
  });

  it('defaults to extract mode and needs only the fields of the chosen mode', () => {
    const schema = getToolById('split')!.options;
    expect(schema.parse({ pages: '1' })).toMatchObject({ mode: 'extract', pages: '1' });
    expect(schema.safeParse({ mode: 'ranges', ranges: '1-2, 3' }).success).toBe(true);
    expect(schema.safeParse({ mode: 'every' }).success).toBe(true);
    expect(schema.safeParse({ mode: 'every', pages: 'not used' }).success).toBe(true);
  });
});

describe('split into several PDFs', () => {
  it('gives one PDF per range, in the order typed', async () => {
    expect(await partWidths(await split([mixed], byRanges('4-5, 1-2, 6')))).toEqual([
      [612, 612],
      [595, 595],
      [420],
    ]);
  });

  it('keeps overlapping ranges as separate PDFs and runs open ranges to the end', async () => {
    expect(await partWidths(await split([mixed], byRanges('2-3, 3-4, 5-')))).toEqual([
      [595, 595],
      [595, 612],
      [612, 420],
    ]);
  });

  it('accepts Arabic-Indic digits and the Arabic comma', async () => {
    expect(await partWidths(await split([mixed], byRanges('١-٢، ٦')))).toEqual([[595, 595], [420]]);
  });

  it('gives one PDF every N pages; the last one may have fewer', async () => {
    expect(await partWidths(await split([mixed], byEvery(4)))).toEqual([
      [595, 595, 595, 612],
      [612, 420],
    ]);
    expect(await partWidths(await split([mixed], byEvery(1)))).toHaveLength(6);
  });

  it('returns a list of one when there is only one part', async () => {
    expect(await partWidths(await split([mixed], byRanges('2-3')))).toEqual([[595, 595]]);
    expect(await partWidths(await split([mixed], byEvery(6)))).toHaveLength(1);
    expect(await partWidths(await split([mixed], byEvery(100)))).toEqual([
      [595, 595, 595, 612, 612, 420],
    ]);
  });

  it('keeps page rotation and writes the producer into every PDF', async () => {
    const parts = several(await split([mixed], byEvery(3), { producer: 'Test Brand' }));
    for (const bytes of parts) {
      const doc = await PDFDocument.load(bytes, { updateMetadata: false });
      expect(doc.getProducer()).toBe('Test Brand');
    }
    const last = await PDFDocument.load(parts[1]!);
    expect(last.getPage(2).getRotation().angle).toBe(90);
  });

  it('reports progress per PDF, then saving', async () => {
    const seen: string[] = [];
    await split([mixed], byEvery(2), {
      onProgress: (p) => seen.push(`${p.phase}:${p.current}/${p.total}`),
    });
    expect(seen).toEqual(['process:1/3', 'process:2/3', 'process:3/3', 'save:3/3']);
  });

  it('rejects a range past the end as PAGE_OUT_OF_RANGE', async () => {
    const error = await failure(split([mixed], byRanges('1-2, 5-9')));
    expect(error.code).toBe('PAGE_OUT_OF_RANGE');
    expect(error.fileIndex).toBe(0);
  });

  it('rejects malformed ranges as INVALID_PAGE_RANGE', async () => {
    expect((await failure(split([mixed], byRanges('3-1')))).code).toBe('INVALID_PAGE_RANGE');
    expect((await failure(split([mixed], byRanges('')))).code).toBe('INVALID_PAGE_RANGE');
  });

  it('reads only the field of the chosen mode', async () => {
    const ranges = { ...byRanges('1'), pages: 'not a page list', every: 2 };
    expect(await partWidths(await split([mixed], ranges))).toEqual([[595]]);
    const every = { ...byEvery(5), pages: '1', ranges: '1' };
    expect(await partWidths(await split([mixed], every))).toHaveLength(2);
  });

  it.each([
    ['pdf/edge/encrypted-user-pw.pdf', 'ENCRYPTED'],
    ['pdf/edge/zero-pages.pdf', 'EMPTY_DOCUMENT'],
  ])('checks the file in every mode: %s', async (rel, code) => {
    const error = await failure(split([corpusBytes(rel)], byEvery(1)));
    expect(error.code).toBe(code);
    expect(error.fileIndex).toBe(0);
  });

  it.skipIf(!manifest[ARABIC])('keeps the embedded fonts of Arabic text in each PDF', async () => {
    for (const bytes of several(await split([corpusBytes(ARABIC)], byEvery(1)))) {
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPage(0).node.Resources()?.toString()).toContain('/Font');
    }
  });

  it('splits 1,200 pages into 1,200 PDFs', async () => {
    const started = performance.now();
    const parts = several(await split([corpusBytes(LARGE)], byEvery(1)));
    expect(performance.now() - started).toBeLessThan(30_000);
    expect(parts).toHaveLength(1200);
    expect((await PDFDocument.load(parts[1199]!)).getPageCount()).toBe(1);
  });

  it('stops with ABORTED when the signal fires', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await failure(split([mixed], byEvery(1), { signal: controller.signal }));
    expect(error.code).toBe('ABORTED');
  });
});

describe('split through the runner', () => {
  const run = (options: Record<string, unknown>, bytes: Uint8Array<ArrayBuffer> = mixed) =>
    runTool('split', [new Blob([bytes])], options);

  it('packs several PDFs into a ZIP named after the default', async () => {
    const out = await run({ mode: 'ranges', ranges: '4-6, 1-3' });
    expect(out.kind).toBe('zip');
    const files = unzipSync(out.bytes);
    expect(Object.keys(files)).toEqual(['split-1.pdf', 'split-2.pdf']);
    expect(await pageWidths(files['split-1.pdf']!)).toEqual([612, 612, 420]);
    expect(await pageWidths(files['split-2.pdf']!)).toEqual([595, 595, 595]);
  });

  it('names the PDFs after the typed name, zero-padded so they sort', async () => {
    const options = { mode: 'every', every: 100, outputName: 'Chapters.pdf' };
    const names = Object.keys(unzipSync((await run(options, corpusBytes(LARGE))).bytes));
    expect(names).toHaveLength(12);
    expect(names[0]).toBe('Chapters-01.pdf');
    expect(names[11]).toBe('Chapters-12.pdf');
  });

  it('stores the PDFs uncompressed, with UTF-8 names', async () => {
    const out = await run({ mode: 'every', every: 3, outputName: 'فصول' });
    expect(Object.keys(unzipSync(out.bytes))).toEqual(['فصول-1.pdf', 'فصول-2.pdf']);
    const { flags, method } = localHeader(out.bytes);
    expect(method, 'stored').toBe(0);
    expect(flags & 0x800, 'UTF-8 name flag').toBe(0x800);
  });

  it('returns a plain PDF when there is only one part', async () => {
    const out = await run({ mode: 'every', every: 10 });
    expect(out.kind).toBe('pdf');
    expect(await pageWidths(out.bytes)).toHaveLength(6);
  });
});
