import { z } from 'zod';
import { BROWSER_MAX_TOTAL_BYTES } from '../../limits';
import { MAX_FILE_NAME_LENGTH } from '../../naming';
import { MAX_PAGE_LIST_LENGTH, parsePageRanges } from '../../pages';
import { defineTool } from '../types';

/** Extracts the pages the user lists into one new PDF. Spec: docs/tools/split-pdf.md */
export const split = defineTool({
  id: 'split',
  slug: 'split-pdf',
  runtime: 'browser',
  category: 'organize',
  input: {
    accept: ['pdf'],
    minFiles: 1,
    maxFiles: 1,
    maxTotalBytes: BROWSER_MAX_TOTAL_BYTES,
    ordered: false,
  },
  output: { kind: 'pdf', defaultBaseName: 'extracted-pages' },
  options: z.object({
    // Required (no default): the form starts empty and the action waits for a valid list.
    pages: z
      .string()
      .max(MAX_PAGE_LIST_LENGTH)
      .refine((value) => parsePageRanges(value) !== null),
    outputName: z.string().max(MAX_FILE_NAME_LENGTH).default(''),
  }),
  related: ['merge'],
  icon: 'Scissors',
});

export type SplitOptions = z.output<typeof split.options>;
