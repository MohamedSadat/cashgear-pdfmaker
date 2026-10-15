import { PdfClientError } from './errors';
import type { ToolDefinition } from './registry/types';
import type { FileKind } from './sniff';

export const MIB = 1024 * 1024;

/**
 * Largest combined input the browser engines accept. Peak memory is roughly 3-4x the input,
 * so this stays well under what a typical device can hold. Tune from error reports.
 */
export const BROWSER_MAX_TOTAL_BYTES = 150 * MIB;

export interface SelectedFile {
  size: number;
  /** Result of sniffing; null when the bytes matched no known type. */
  kind: FileKind | null;
}

/**
 * Checks a selection against a tool's input rules. Returns the first problem, or null.
 * TOO_FEW_FILES is checked last because the UI shows it as a hint, not an error.
 */
export function validateSelection(
  tool: Pick<ToolDefinition, 'input'>,
  files: readonly SelectedFile[],
): PdfClientError | null {
  const { accept, minFiles, maxFiles, maxTotalBytes } = tool.input;
  const badIndex = files.findIndex((f) => f.kind === null || !accept.includes(f.kind));
  if (badIndex !== -1) return new PdfClientError('UNSUPPORTED_TYPE', { fileIndex: badIndex });
  if (files.length > maxFiles) return new PdfClientError('TOO_MANY_FILES');
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > maxTotalBytes) return new PdfClientError('TOO_LARGE');
  if (files.length < minFiles) return new PdfClientError('TOO_FEW_FILES');
  return null;
}
