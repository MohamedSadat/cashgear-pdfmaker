import type { FileKind } from '../sniff';

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
 * What an operation returns: one file, or a list of files of the tool's output kind. The runner
 * returns a list of one as that file and packs a longer list into a ZIP.
 */
export type OperationOutput = Uint8Array<ArrayBuffer> | Uint8Array<ArrayBuffer>[];

/**
 * A browser engine operation. Pure: no DOM access, bytes in and bytes out, so it runs unchanged
 * in Node (tests), a Web Worker, or the main thread. `R` narrows the output for an operation that
 * always returns one file.
 */
export type Operation<O = unknown, R extends OperationOutput = OperationOutput> = (
  inputs: readonly Uint8Array[],
  options: O,
  context?: OperationContext,
) => Promise<R>;

/** The file a run produced. `kind` is the tool's output kind, or 'zip' for several files. */
export interface RunOutput {
  bytes: Uint8Array<ArrayBuffer>;
  kind: FileKind;
}
