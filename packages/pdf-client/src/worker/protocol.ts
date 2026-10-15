import type { Progress } from '../engine/types';
import type { PdfErrorJSON } from '../errors';
import type { FileKind } from '../sniff';

/** Main thread to worker. Input buffers are transferred, not copied. */
export interface RunRequest {
  type: 'run';
  toolId: string;
  options: unknown;
  inputs: ArrayBuffer[];
  producer?: string;
}

/** Worker to main thread. `ready` is sent once the worker script has loaded. */
export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'progress'; progress: Progress }
  | { type: 'done'; output: ArrayBuffer; kind: FileKind }
  | { type: 'error'; error: PdfErrorJSON };
