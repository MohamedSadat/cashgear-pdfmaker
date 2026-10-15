import { describe, expect, it } from 'vitest';
import { PdfClientError, isPdfErrorCode, toPdfClientError } from '../src/errors';

describe('PdfClientError', () => {
  it('round-trips through JSON (the worker boundary)', () => {
    const original = new PdfClientError('ENCRYPTED', { fileIndex: 2 });
    const copy = PdfClientError.fromJSON(JSON.parse(JSON.stringify(original)));
    expect(copy).toBeInstanceOf(PdfClientError);
    expect(copy.code).toBe('ENCRYPTED');
    expect(copy.fileIndex).toBe(2);
  });

  it('omits fileIndex when not set', () => {
    expect(new PdfClientError('TOO_LARGE').toJSON()).not.toHaveProperty('fileIndex');
  });

  it('maps unknown codes from JSON to UNKNOWN', () => {
    const copy = PdfClientError.fromJSON({
      name: 'PdfClientError',
      code: 'NOPE',
      message: '',
    } as never);
    expect(copy.code).toBe('UNKNOWN');
  });
});

describe('toPdfClientError', () => {
  it('keeps PdfClientError as is', () => {
    const e = new PdfClientError('INVALID_PDF');
    expect(toPdfClientError(e)).toBe(e);
  });

  it('turns AbortError into ABORTED', () => {
    const controller = new AbortController();
    controller.abort();
    let thrown: unknown;
    try {
      controller.signal.throwIfAborted();
    } catch (e) {
      thrown = e;
    }
    expect(toPdfClientError(thrown).code).toBe('ABORTED');
  });

  it('wraps anything else as UNKNOWN', () => {
    expect(toPdfClientError(new Error('boom')).code).toBe('UNKNOWN');
    expect(toPdfClientError('boom').code).toBe('UNKNOWN');
  });

  it('recognizes codes', () => {
    expect(isPdfErrorCode('ENCRYPTED')).toBe(true);
    expect(isPdfErrorCode('encrypted')).toBe(false);
  });
});
