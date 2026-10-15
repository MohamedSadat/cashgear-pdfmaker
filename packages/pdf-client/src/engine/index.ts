import { merge } from './merge';
import { split } from './split';
import type { Operation } from './types';

export * from './types';
export { loadPdf } from './load';

/** Browser engine operation per tool id. Tools with runtime 'server' have none. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry validates its own options
export const operations: Partial<Record<string, Operation<any>>> = {
  merge,
  split,
};
