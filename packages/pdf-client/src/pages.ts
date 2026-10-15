/** One item of a page list: 1-based and inclusive. `end` is null for "to the last page". */
export interface PageRange {
  start: number;
  end: number | null;
}

/** Longest page list a tool option accepts. */
export const MAX_PAGE_LIST_LENGTH = 500;

// Arabic-Indic (U+0660-0669) and Extended Arabic-Indic (U+06F0-06F9, Persian and Urdu) digits.
const NON_ASCII_DIGITS = /[\u0660-\u0669\u06f0-\u06f9]/g;
// Comma and Arabic comma.
const SEPARATOR = /[,\u060c]/;
// "5", "1-3" or "8-"; hyphen, en dash or em dash. \d matches ASCII digits only.
const ITEM = /^(\d+)\s*(?:[-\u2013\u2014]\s*(\d*))?$/;

function toAsciiDigits(text: string): string {
  return text.replace(NON_ASCII_DIGITS, (d) =>
    String(d.charCodeAt(0) - (d >= '\u06f0' ? 0x06f0 : 0x0660)),
  );
}

/**
 * Parses a page list such as "1-3, 5, 8-". Arabic-Indic digits and the Arabic comma work too, and
 * empty items are skipped so a trailing comma is fine. Returns null when there is no item or an
 * item is malformed: page 0, a backwards range ("3-1"), or anything but digits and one dash.
 * services/pdfcore/src/pdfcore/pages.py follows the same rules.
 */
export function parsePageRanges(input: string): PageRange[] | null {
  const ranges: PageRange[] = [];
  for (const raw of toAsciiDigits(input).split(SEPARATOR)) {
    const item = raw.trim();
    if (item === '') continue;
    const match = ITEM.exec(item);
    if (!match) return null;
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : match[2] === '' ? null : Number(match[2]);
    if (start < 1 || (end !== null && end < start)) return null;
    ranges.push({ start, end });
  }
  return ranges.length > 0 ? ranges : null;
}

/**
 * Resolves ranges against a document of `pageCount` pages: 0-based page indices in document
 * order, without duplicates. Returns null when any range reaches past the last page.
 */
export function pageIndices(ranges: readonly PageRange[], pageCount: number): number[] | null {
  const selected = new Set<number>();
  for (const { start, end } of ranges) {
    const last = end ?? pageCount;
    if (start > pageCount || last > pageCount) return null;
    for (let page = start; page <= last; page++) selected.add(page - 1);
  }
  return [...selected].sort((a, b) => a - b);
}

/**
 * One group of 0-based page indices per range, in the order the ranges were typed, for splitting
 * a document into one file per range. Overlapping and repeated ranges keep their own group.
 * Returns null when any range reaches past the last page.
 */
export function pageGroups(ranges: readonly PageRange[], pageCount: number): number[][] | null {
  const groups: number[][] = [];
  for (const range of ranges) {
    const indices = pageIndices([range], pageCount);
    if (!indices) return null;
    groups.push(indices);
  }
  return groups;
}

/** 0-based page indices cut every `size` pages; the last chunk may be shorter. */
export function pageChunks(pageCount: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError(`Invalid chunk size ${size}`);
  const chunks: number[][] = [];
  for (let start = 0; start < pageCount; start += size) {
    const end = Math.min(start + size, pageCount);
    chunks.push(Array.from({ length: end - start }, (_, i) => start + i));
  }
  return chunks;
}
