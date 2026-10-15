import { z } from 'zod';
import { BROWSER_MAX_TOTAL_BYTES } from '../../limits';
import { MAX_FILE_NAME_LENGTH } from '../../naming';
import { defineTool } from '../types';

/** Reference tool: every later tool follows this entry's shape. Spec: docs/tools/merge-pdf.md */
export const merge = defineTool({
  id: 'merge',
  slug: 'merge-pdf',
  runtime: 'browser',
  category: 'organize',
  input: {
    accept: ['pdf'],
    minFiles: 2,
    maxFiles: 50,
    maxTotalBytes: BROWSER_MAX_TOTAL_BYTES,
    ordered: true,
  },
  output: { kind: 'pdf', defaultBaseName: 'merged' },
  options: z.object({
    outputName: z.string().max(MAX_FILE_NAME_LENGTH).default(''),
  }),
  related: ['split'],
  icon: 'Combine',
});

export type MergeOptions = z.output<typeof merge.options>;
