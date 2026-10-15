import { operations } from '../engine/index';
import type { OperationContext, RunOutput } from '../engine/types';
import { zipFiles } from '../engine/zip';
import { PdfClientError, throwIfAborted } from '../errors';
import { outputBaseName, partFileName } from '../naming';
import { getToolById } from '../registry/index';

/**
 * Runs a tool's engine operation after re-validating its options, and returns one file: what the
 * operation returned, or a ZIP when it returned several files. Shared by the worker and the
 * main-thread fallback so both behave identically.
 */
export async function execute(
  toolId: string,
  inputs: readonly Uint8Array[],
  rawOptions: unknown,
  context: OperationContext = {},
): Promise<RunOutput> {
  const tool = getToolById(toolId);
  const operation = operations[toolId];
  if (!tool || !operation) {
    throw new PdfClientError('UNKNOWN', { message: `No browser engine for tool "${toolId}"` });
  }
  const parsed = tool.options.safeParse(rawOptions ?? {});
  if (!parsed.success) {
    throw new PdfClientError('UNKNOWN', { message: `Invalid options: ${parsed.error.message}` });
  }
  throwIfAborted(context.signal);
  const output = await operation(inputs, parsed.data, context);

  const files = Array.isArray(output) ? output : [output];
  const [first] = files;
  if (!first) throw new PdfClientError('UNKNOWN', { message: `"${toolId}" returned no file` });
  if (files.length === 1) return { bytes: first, kind: tool.output.kind };

  // Several files: name them after the ZIP, which the UI names from the same `outputName`.
  throwIfAborted(context.signal);
  const { outputName } = parsed.data as { outputName?: unknown };
  const base = outputBaseName(tool.output, typeof outputName === 'string' ? outputName : '', 'zip');
  const named = files.map(
    (bytes, index) => [partFileName(base, index, files.length, tool.output.kind), bytes] as const,
  );
  return { bytes: zipFiles(named), kind: 'zip' };
}
