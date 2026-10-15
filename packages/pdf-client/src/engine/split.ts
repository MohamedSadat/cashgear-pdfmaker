import { PDFDocument } from '@cantoo/pdf-lib';
import { PdfClientError, throwIfAborted } from '../errors';
import { pageIndices, parsePageRanges } from '../pages';
import type { SplitOptions } from '../registry/tools/split';
import { loadPdf } from './load';
import type { Operation } from './types';

/**
 * Copies the pages listed in `pages` ("1-3, 5, 8-") into a new PDF, in document order and without
 * duplicates. Pages are copied as they are (content, fonts, rotation); document-level bookmarks
 * and form fields are not carried over. `outputName` only affects the download name.
 */
export const split: Operation<SplitOptions> = async (inputs, options, context = {}) => {
  const { onProgress, signal, producer } = context;
  const [bytes] = inputs;
  if (!bytes) throw new PdfClientError('TOO_FEW_FILES');
  if (inputs.length > 1) throw new PdfClientError('TOO_MANY_FILES');
  const ranges = parsePageRanges(options.pages);
  if (!ranges) throw new PdfClientError('INVALID_PAGE_RANGE');

  throwIfAborted(signal);
  onProgress?.({ phase: 'process', current: 1, total: 1 });
  const source = await loadPdf(bytes, 0);
  const pageCount = source.getPageCount();
  if (pageCount === 0) throw new PdfClientError('EMPTY_DOCUMENT', { fileIndex: 0 });
  const indices = pageIndices(ranges, pageCount);
  if (!indices) throw new PdfClientError('PAGE_OUT_OF_RANGE', { fileIndex: 0 });

  const out = await PDFDocument.create({ updateMetadata: false });
  for (const page of await out.copyPages(source, indices)) out.addPage(page);

  throwIfAborted(signal);
  onProgress?.({ phase: 'save', current: 1, total: 1 });
  if (producer) {
    out.setProducer(producer);
    out.setCreator(producer);
  }
  return (await out.save({ useObjectStreams: true })) as Uint8Array<ArrayBuffer>;
};
