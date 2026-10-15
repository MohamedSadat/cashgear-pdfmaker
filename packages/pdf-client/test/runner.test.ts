import { describe, expect, it } from 'vitest';
import { PdfClientError } from '../src/errors';
import { runTool } from '../src/worker/client';

// Node has no Web Worker, so these exercise the main-thread fallback path.
describe('runTool', () => {
  it('rejects an unknown tool with a PdfClientError', async () => {
    const error = await runTool('nope', [new Blob(['x'])], {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PdfClientError);
    expect((error as PdfClientError).code).toBe('UNKNOWN');
  });

  it('rejects with ABORTED when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await runTool('nope', [], {}, { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    expect((error as PdfClientError).code).toBe('ABORTED');
  });
});
