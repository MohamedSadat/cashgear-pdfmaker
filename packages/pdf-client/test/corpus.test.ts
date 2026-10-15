import { describe, expect, it } from 'vitest';
import { sniffBytes } from '../src/sniff';
import { corpusBytes, manifest } from './helpers/corpus';

describe('test corpus', () => {
  it.each(Object.entries(manifest))('%s sniffs as expected', (rel, entry) => {
    const kind = sniffBytes(corpusBytes(rel).subarray(0, 1024), rel);
    expect(kind).toBe(entry.sniff === null ? null : 'pdf');
  });
});
