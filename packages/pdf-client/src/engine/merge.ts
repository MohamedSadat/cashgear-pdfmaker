import { PDFDocument } from '@cantoo/pdf-lib';
import { PdfClientError, throwIfAborted } from '../errors';
import type { MergeOptions } from '../registry/tools/merge';
import { loadPdf } from './load';
import type { Operation } from './types';

/**
 * Concatenates the pages of every input, in input order. Pages are copied as they are (content,
 * fonts, rotation); document-level bookmarks and form fields are not carried over.
 * `outputName` only affects the download name, which the UI derives from the options.
 */
export const merge: Operation<MergeOptions> = async (inputs, _options, context = {}) => {
  const { onProgress, signal, producer } = context;
  if (inputs.length < 2) throw new PdfClientError('TOO_FEW_FILES');

  const out = await PDFDocument.create({ updateMetadata: false });
  for (const [index, bytes] of inputs.entries()) {
    throwIfAborted(signal);
    onProgress?.({ phase: 'process', current: index + 1, total: inputs.length });
    const source = await loadPdf(bytes, index);
    if (source.getPageCount() === 0)
      throw new PdfClientError('EMPTY_DOCUMENT', { fileIndex: index });
    const pages = await out.copyPages(source, source.getPageIndices());
    for (const page of pages) out.addPage(page);
  }

  throwIfAborted(signal);
  onProgress?.({ phase: 'save', current: inputs.length, total: inputs.length });
  if (producer) {
    out.setProducer(producer);
    out.setCreator(producer);
  }
  return (await out.save({ useObjectStreams: true })) as Uint8Array<ArrayBuffer>;
};
