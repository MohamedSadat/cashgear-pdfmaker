import { operations } from '../engine/index';
import type { OperationContext } from '../engine/types';
import { PdfClientError, throwIfAborted } from '../errors';
import { getToolById } from '../registry/index';

/**
 * Runs a tool's engine operation after re-validating its options. Shared by the worker and the
 * main-thread fallback so both behave identically.
 */
export async function execute(
  toolId: string,
  inputs: readonly Uint8Array[],
  rawOptions: unknown,
  context: OperationContext = {},
): Promise<Uint8Array<ArrayBuffer>> {
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
  return operation(inputs, parsed.data, context);
}
