import { z } from 'zod';
import { BROWSER_MAX_TOTAL_BYTES } from '../../limits';
import { MAX_FILE_NAME_LENGTH } from '../../naming';
import { MAX_PAGE_LIST_LENGTH, parsePageRanges } from '../../pages';
import { defineTool } from '../types';

/** extract: the listed pages into one PDF; ranges: one PDF per range; every: one PDF per N pages. */
export const SPLIT_MODES = ['extract', 'ranges', 'every'] as const;

/**
 * Extracts pages into one PDF, or splits one PDF into several (one per range, or every N pages),
 * which download as one ZIP. Spec: docs/tools/split-pdf.md
 */
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
  output: { kind: 'pdf', defaultBaseName: 'extracted-pages', zipBaseName: 'split' },
  options: z
    .object({
      mode: z.enum(SPLIT_MODES).default('extract'),
      // Required in their own mode (checked below): the form starts them empty and the action
      // waits for a valid list. The other modes ignore them.
      pages: z.string().max(MAX_PAGE_LIST_LENGTH).default(''),
      ranges: z.string().max(MAX_PAGE_LIST_LENGTH).default(''),
      every: z.int().min(1).default(1),
      outputName: z.string().max(MAX_FILE_NAME_LENGTH).default(''),
    })
    .superRefine(({ mode, pages, ranges }, ctx) => {
      if (mode === 'extract' && parsePageRanges(pages) === null) {
        ctx.addIssue({ code: 'custom', path: ['pages'], message: 'INVALID_PAGE_RANGE' });
      }
      if (mode === 'ranges' && parsePageRanges(ranges) === null) {
        ctx.addIssue({ code: 'custom', path: ['ranges'], message: 'INVALID_PAGE_RANGE' });
      }
    }),
  conditionalOptions: {
    pages: { mode: ['extract'] },
    ranges: { mode: ['ranges'] },
    every: { mode: ['every'] },
  },
  related: ['merge'],
  icon: 'Scissors',
});

export type SplitOptions = z.output<typeof split.options>;
export type SplitMode = (typeof SPLIT_MODES)[number];
