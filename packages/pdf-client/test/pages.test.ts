import { describe, expect, it } from 'vitest';
import { pageChunks, pageGroups, pageIndices, parsePageRanges } from '../src/pages';

describe('parsePageRanges', () => {
  it('reads single pages, ranges and open ranges', () => {
    expect(parsePageRanges('5')).toEqual([{ start: 5, end: 5 }]);
    expect(parsePageRanges('1-3')).toEqual([{ start: 1, end: 3 }]);
    expect(parsePageRanges('8-')).toEqual([{ start: 8, end: null }]);
    expect(parsePageRanges(' 1 - 3 , 5,8- ')).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 8, end: null },
    ]);
  });

  it('accepts Arabic-Indic digits, the Arabic comma and dashes', () => {
    expect(parsePageRanges('١-٣، ٥')).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
    ]);
    expect(parsePageRanges('۲-۴')).toEqual([{ start: 2, end: 4 }]);
    expect(parsePageRanges('1–3, 4—5')).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 5 },
    ]);
  });

  it('skips empty items so a trailing comma is fine', () => {
    expect(parsePageRanges('1,,3,')).toEqual([
      { start: 1, end: 1 },
      { start: 3, end: 3 },
    ]);
  });

  it.each(['', '  ', ',', '0', '0-2', '3-1', '-3', '1 2', 'a', '1-2-3', '1.5', '1-x', '+1'])(
    'rejects %j',
    (input) => {
      expect(parsePageRanges(input)).toBeNull();
    },
  );
});

describe('pageIndices', () => {
  const indices = (spec: string, pageCount: number) =>
    pageIndices(parsePageRanges(spec) ?? [], pageCount);

  it('returns 0-based indices in document order without duplicates', () => {
    expect(indices('1-3, 5', 6)).toEqual([0, 1, 2, 4]);
    expect(indices('5, 1-3, 2', 6)).toEqual([0, 1, 2, 4]);
  });

  it('runs an open range to the last page', () => {
    expect(indices('2-', 4)).toEqual([1, 2, 3]);
    expect(indices('3-', 3)).toEqual([2]);
  });

  it('returns null when a page is past the end', () => {
    expect(indices('2-9', 3)).toBeNull();
    expect(indices('4', 3)).toBeNull();
    expect(indices('4-', 3)).toBeNull();
    expect(indices('99999999999999999999', 3)).toBeNull();
  });
});

describe('pageGroups', () => {
  const groups = (spec: string, pageCount: number) =>
    pageGroups(parsePageRanges(spec) ?? [], pageCount);

  it('gives one group per range, in the order typed', () => {
    expect(groups('1-2, 3-5', 5)).toEqual([
      [0, 1],
      [2, 3, 4],
    ]);
    expect(groups('5, 1-3', 5)).toEqual([[4], [0, 1, 2]]);
  });

  it('keeps overlapping and repeated ranges as separate groups', () => {
    expect(groups('1-3, 2-4, 2-4', 4)).toEqual([
      [0, 1, 2],
      [1, 2, 3],
      [1, 2, 3],
    ]);
  });

  it('runs an open range to the last page', () => {
    expect(groups('1, 3-', 4)).toEqual([[0], [2, 3]]);
  });

  it('returns null when any range reaches past the end', () => {
    expect(groups('1-2, 3-9', 5)).toBeNull();
    expect(groups('6-', 5)).toBeNull();
  });
});

describe('pageChunks', () => {
  it('cuts the document every N pages; the last chunk may be shorter', () => {
    expect(pageChunks(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(pageChunks(4, 2)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(pageChunks(3, 1)).toEqual([[0], [1], [2]]);
  });

  it('gives one chunk when N is at least the page count', () => {
    expect(pageChunks(3, 3)).toEqual([[0, 1, 2]]);
    expect(pageChunks(3, 100)).toEqual([[0, 1, 2]]);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects a chunk size of %s', (size) => {
    expect(() => pageChunks(3, size)).toThrow(RangeError);
  });
});
