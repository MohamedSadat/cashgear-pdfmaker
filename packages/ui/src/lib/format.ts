import { MIB } from '@repo/pdf-client';

/** Formats a byte count as megabytes in the given locale, e.g. "150 MB" or "١٥٠ ميغابايت". */
export function formatMegabytes(bytes: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: bytes < 10 * MIB ? 1 : 0,
  }).format(bytes / MIB);
}
