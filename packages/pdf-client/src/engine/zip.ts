import { type Zippable, zipSync } from 'fflate';

/**
 * Packs named files into one ZIP, all at its root. Entries are stored, not deflated: PDF streams
 * are compressed already, so deflating again costs time for little gain. fflate marks non-ASCII
 * names as UTF-8, so Arabic names unzip correctly.
 */
export function zipFiles(
  files: readonly (readonly [name: string, bytes: Uint8Array])[],
): Uint8Array<ArrayBuffer> {
  const entries: Zippable = {};
  for (const [name, bytes] of files) {
    if (name in entries) throw new Error(`Duplicate ZIP entry "${name}"`);
    entries[name] = bytes;
  }
  return zipSync(entries, { level: 0 }) as Uint8Array<ArrayBuffer>;
}
