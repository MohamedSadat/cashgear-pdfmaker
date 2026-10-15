import type { ToolOutput } from './registry/types';
import { FILE_KIND_INFO } from './sniff';

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

/**
 * Output file name for a tool run: the user's name if given (sanitized), else the tool's default,
 * always ending in the output kind's extension.
 */
export function outputFileName(output: ToolOutput, requested?: string): string {
  const ext = FILE_KIND_INFO[output.kind].extensions[0] ?? '';
  let base = sanitizeBaseName(requested ?? '');
  if (ext && base.toLowerCase().endsWith(ext)) base = base.slice(0, -ext.length).trim();
  return `${base || output.defaultBaseName}${ext}`;
}
