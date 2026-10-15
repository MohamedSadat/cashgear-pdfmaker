export interface Progress {
  phase: 'read' | 'process' | 'save';
  current: number;
  total: number;
}

export interface OperationContext {
  onProgress?: (progress: Progress) => void;
  signal?: AbortSignal;
  /** Written to the output's Producer/Creator metadata (the brand name). */
  producer?: string;
}

/**
 * A browser engine operation. Pure: no DOM access, bytes in and bytes out, so it runs unchanged
 * in Node (tests), a Web Worker, or the main thread.
 */
export type Operation<O = unknown> = (
  inputs: readonly Uint8Array[],
  options: O,
  context?: OperationContext,
) => Promise<Uint8Array<ArrayBuffer>>;
