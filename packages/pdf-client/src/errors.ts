/**
 * Error codes shared by every engine (browser and Python). The UI translates them through
 * `ui.errors.<code>`; services/pdfcore uses the same strings.
 */
export const PDF_ERROR_CODES = [
  'UNSUPPORTED_TYPE',
  'INVALID_PDF',
  'ENCRYPTED',
  'EMPTY_DOCUMENT',
  'INVALID_PAGE_RANGE',
  'PAGE_OUT_OF_RANGE',
  'TOO_FEW_FILES',
  'TOO_MANY_FILES',
  'TOO_LARGE',
  'ABORTED',
  'UNKNOWN',
] as const;

export type PdfErrorCode = (typeof PDF_ERROR_CODES)[number];

export interface PdfErrorJSON {
  name: 'PdfClientError';
  code: PdfErrorCode;
  message: string;
  fileIndex?: number;
}

export class PdfClientError extends Error {
  override readonly name = 'PdfClientError';
  readonly code: PdfErrorCode;
  /** Index of the offending input file, when one file caused the error. */
  readonly fileIndex?: number;

  constructor(
    code: PdfErrorCode,
    options: { fileIndex?: number; cause?: unknown; message?: string } = {},
  ) {
    super(options.message ?? code, { cause: options.cause });
    this.code = code;
    if (options.fileIndex !== undefined) this.fileIndex = options.fileIndex;
  }

  toJSON(): PdfErrorJSON {
    const json: PdfErrorJSON = { name: this.name, code: this.code, message: this.message };
    if (this.fileIndex !== undefined) json.fileIndex = this.fileIndex;
    return json;
  }

  static fromJSON(json: PdfErrorJSON): PdfClientError {
    const options: { fileIndex?: number; message: string } = { message: json.message };
    if (json.fileIndex !== undefined) options.fileIndex = json.fileIndex;
    return new PdfClientError(isPdfErrorCode(json.code) ? json.code : 'UNKNOWN', options);
  }
}

export function isPdfErrorCode(value: unknown): value is PdfErrorCode {
  return typeof value === 'string' && (PDF_ERROR_CODES as readonly string[]).includes(value);
}

/** Normalizes anything thrown into a PdfClientError (aborts become ABORTED). */
export function toPdfClientError(error: unknown): PdfClientError {
  if (error instanceof PdfClientError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new PdfClientError('ABORTED', { cause: error });
  }
  return new PdfClientError('UNKNOWN', {
    cause: error,
    message: error instanceof Error ? error.message : String(error),
  });
}

/** Like `signal.throwIfAborted()`, but throws the typed ABORTED error engines are expected to. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new PdfClientError('ABORTED');
}
