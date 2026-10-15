import { PDFDocument } from '@cantoo/pdf-lib';
import { PdfClientError, throwIfAborted } from '../errors';
import { pageChunks, pageGroups, pageIndices, parsePageRanges } from '../pages';
import type { SplitOptions } from '../registry/tools/split';
import { loadPdf } from './load';
import type { Operation } from './types';

/** Page indices of each output PDF, or null when a listed page is past the end. */
type Plan = (pageCount: number) => number[][] | null;

/** Checks the page list of the chosen mode before the file is read. */
function planFor(options: SplitOptions): Plan {
  if (options.mode === 'every') return (pageCount) => pageChunks(pageCount, options.every);
  const ranges = parsePageRanges(options.mode === 'ranges' ? options.ranges : options.pages);
  if (!ranges) throw new PdfClientError('INVALID_PAGE_RANGE');
  if (options.mode === 'ranges') return (pageCount) => pageGroups(ranges, pageCount);
  return (pageCount) => {
    const indices = pageIndices(ranges, pageCount);
    return indices && [indices];
  };
}

/**
 * `extract` copies the pages listed in `pages` ("1-3, 5, 8-") into one new PDF, in document order
 * and without duplicates. `ranges` returns one PDF per item of `ranges`, in the order typed, and
 * `every` one PDF per `every` pages; both return a list, which the runner packs into a ZIP when it
 * holds more than one PDF. Pages are copied as they are (content, fonts, rotation); document-level
 * bookmarks and form fields are not carried over. `outputName` only affects the download names.
 */
export const split: Operation<SplitOptions> = async (inputs, options, context = {}) => {
  const { onProgress, signal, producer } = context;
  const [bytes] = inputs;
  if (!bytes) throw new PdfClientError('TOO_FEW_FILES');
  if (inputs.length > 1) throw new PdfClientError('TOO_MANY_FILES');
  const plan = planFor(options);

  throwIfAborted(signal);
  const source = await loadPdf(bytes, 0);
  const pageCount = source.getPageCount();
  if (pageCount === 0) throw new PdfClientError('EMPTY_DOCUMENT', { fileIndex: 0 });
  const parts = plan(pageCount);
  if (!parts) throw new PdfClientError('PAGE_OUT_OF_RANGE', { fileIndex: 0 });

  const files: Uint8Array<ArrayBuffer>[] = [];
  for (const [index, indices] of parts.entries()) {
    throwIfAborted(signal);
    onProgress?.({ phase: 'process', current: index + 1, total: parts.length });
    const out = await PDFDocument.create({ updateMetadata: false });
    for (const page of await out.copyPages(source, indices)) out.addPage(page);
    if (producer) {
      out.setProducer(producer);
      out.setCreator(producer);
    }
    files.push((await out.save({ useObjectStreams: true })) as Uint8Array<ArrayBuffer>);
  }

  throwIfAborted(signal);
  onProgress?.({ phase: 'save', current: parts.length, total: parts.length });
  return options.mode === 'extract' ? files[0]! : files;
};
