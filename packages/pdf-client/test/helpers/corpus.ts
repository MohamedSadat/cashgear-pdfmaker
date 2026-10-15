import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface CorpusEntry {
  purpose: string;
  pages?: number;
  encrypted?: boolean;
  firstPageSize?: [number, number];
  rotate?: number;
  expectError?: string;
  sniff?: null;
}

const TESTDATA = fileURLToPath(new URL('../../../../testdata/', import.meta.url));
const LFS_POINTER = 'version https://git-lfs';

export const manifest: Record<string, CorpusEntry> = JSON.parse(
  readFileSync(`${TESTDATA}manifest.json`, 'utf8'),
).files;

/** Reads a corpus file; fails loudly when Git LFS left a pointer file instead of the PDF. */
export function corpusBytes(rel: string): Uint8Array<ArrayBuffer> {
  const buffer = readFileSync(`${TESTDATA}${rel}`);
  if (buffer.subarray(0, LFS_POINTER.length).toString('latin1') === LFS_POINTER) {
    throw new Error(`${rel} is a Git LFS pointer; run \`git lfs pull\``);
  }
  return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length));
}
