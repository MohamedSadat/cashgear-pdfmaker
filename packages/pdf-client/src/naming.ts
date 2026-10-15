import type { ToolOutput } from './registry/types';
import { FILE_KIND_INFO, type FileKind } from './sniff';

export const MAX_FILE_NAME_LENGTH = 100;

// Bidi controls (U+202A-202E, U+2066-2069) can disguise an extension ("gpj.exe" shown as
// "exe.jpg"), and C0 controls are invalid in file names.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;
const RESERVED_CHARS = /[<>:"/\\|?*]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * Turns user input into a safe base name (no extension), or '' when nothing usable remains.
 * Arabic and other non-Latin names are kept as typed.
 */
export function sanitizeBaseName(input: string): string {
  let name = input
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '')
    .replace(RESERVED_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '');
  name = Array.from(name).slice(0, MAX_FILE_NAME_LENGTH).join('').trim();
  if (WINDOWS_RESERVED.test(name)) name = `_${name}`;
  return name;
}

const extensionOf = (kind: FileKind) => FILE_KIND_INFO[kind].extensions[0] ?? '';

/**
 * Base name (no extension) of a run's output of `kind`, which is `output.kind` unless the run
 * returned something else, such as a ZIP of several files. It is the user's name, sanitized and
 * without a trailing extension of either kind, else the tool's default for that kind.
 */
export function outputBaseName(
  output: ToolOutput,
  requested = '',
  kind: FileKind = output.kind,
): string {
  let base = sanitizeBaseName(requested);
  const lower = base.toLowerCase();
  const ext = [...FILE_KIND_INFO[kind].extensions, ...FILE_KIND_INFO[output.kind].extensions].find(
    (e) => lower.endsWith(e),
  );
  // Sanitize again: dropping ".pdf" from "report..pdf" leaves a trailing dot.
  if (ext) base = sanitizeBaseName(base.slice(0, -ext.length));
  const fallback =
    kind === 'zip' && output.zipBaseName ? output.zipBaseName : output.defaultBaseName;
  return base || fallback;
}

/**
 * Output file name for a tool run: the user's name if given (sanitized), else the tool's default,
 * always ending in the extension of the kind the run returned (by default the tool's usual kind).
 */
export function outputFileName(
  output: ToolOutput,
  requested?: string,
  kind: FileKind = output.kind,
): string {
  return `${outputBaseName(output, requested, kind)}${extensionOf(kind)}`;
}

/**
 * Name of file `index` (0-based) of `count` packed into one ZIP: `<base>-1.pdf`, `<base>-2.pdf`.
 * The number is zero-padded to the digits of `count` so the names sort in order everywhere.
 */
export function partFileName(base: string, index: number, count: number, kind: FileKind): string {
  const number = String(index + 1).padStart(String(count).length, '0');
  return `${base}-${number}${extensionOf(kind)}`;
}
