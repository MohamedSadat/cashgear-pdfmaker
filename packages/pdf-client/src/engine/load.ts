import { EncryptedPDFError, PDFDocument } from '@cantoo/pdf-lib';
import { PdfClientError } from '../errors';

/**
 * Loads one input PDF and maps pdf-lib's failures to typed errors carrying the file's index.
 * Every encrypted file is rejected, even one with only an owner password: whether to open those
 * automatically is an open product decision, and pdfcore behaves the same way.
 */
export async function loadPdf(bytes: Uint8Array, fileIndex: number): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    // instanceof, not constructor.name: production bundles minify class names.
    const code = error instanceof EncryptedPDFError ? 'ENCRYPTED' : 'INVALID_PDF';
    throw new PdfClientError(code, { fileIndex, cause: error });
  }
  if (doc.isEncrypted) throw new PdfClientError('ENCRYPTED', { fileIndex });
  return doc;
}
