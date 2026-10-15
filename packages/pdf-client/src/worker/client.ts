import type { Progress, RunOutput } from '../engine/types';
import { PdfClientError, toPdfClientError } from '../errors';
import type { RunRequest, WorkerMessage } from './protocol';

export interface RunToolOptions {
  onProgress?: (progress: Progress) => void;
  signal?: AbortSignal;
  /** Written to the output's Producer/Creator metadata. */
  producer?: string;
}

/**
 * Runs a browser tool on the given files and resolves with the file it produced: the tool's usual
 * kind of output, or a ZIP when the run produced several files.
 *
 * File bytes are read only now, at run time. The work happens in a fresh module Web Worker that
 * receives the buffers by transfer and is terminated afterwards. If no worker can start (old
 * browser, test environment, blocked script), the same code runs on the main thread instead.
 */
export async function runTool(
  toolId: string,
  files: readonly Blob[],
  options: unknown,
  { onProgress, signal, producer }: RunToolOptions = {},
): Promise<RunOutput> {
  try {
    signal?.throwIfAborted();
    onProgress?.({ phase: 'read', current: 0, total: files.length });
    const inputs = await Promise.all(files.map((f) => f.arrayBuffer()));
    signal?.throwIfAborted();
    const request: RunRequest = { type: 'run', toolId, options, inputs };
    if (producer) request.producer = producer;

    const worker = startWorker();
    if (worker) {
      const result = await runInWorker(worker, request, onProgress, signal);
      if (result !== 'unavailable') return result;
    }
    return await runInline(request, onProgress, signal);
  } catch (error) {
    throw toPdfClientError(error);
  }
}

function startWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    // Must stay a literal `new URL(..., import.meta.url)` so bundlers emit the worker chunk.
    return new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

/** Resolves 'unavailable' when the worker fails before it is ready (inputs are still intact). */
function runInWorker(
  worker: Worker,
  request: RunRequest,
  onProgress: RunToolOptions['onProgress'],
  signal: AbortSignal | undefined,
): Promise<RunOutput | 'unavailable'> {
  return new Promise((resolve, reject) => {
    let started = false;
    const finish = () => {
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      finish();
      reject(new PdfClientError('ABORTED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      switch (message.type) {
        case 'ready':
          started = true;
          worker.postMessage(request, request.inputs);
          break;
        case 'progress':
          onProgress?.(message.progress);
          break;
        case 'done':
          finish();
          resolve({ bytes: new Uint8Array(message.output), kind: message.kind });
          break;
        case 'error':
          finish();
          reject(PdfClientError.fromJSON(message.error));
          break;
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish();
      if (started) reject(new PdfClientError('UNKNOWN', { message: event.message }));
      else resolve('unavailable');
    };
  });
}

async function runInline(
  request: RunRequest,
  onProgress: RunToolOptions['onProgress'],
  signal: AbortSignal | undefined,
): Promise<RunOutput> {
  const { execute } = await import('./execute');
  return execute(
    request.toolId,
    request.inputs.map((b) => new Uint8Array(b)),
    request.options,
    {
      ...(onProgress ? { onProgress } : {}),
      ...(signal ? { signal } : {}),
      ...(request.producer ? { producer: request.producer } : {}),
    },
  );
}
