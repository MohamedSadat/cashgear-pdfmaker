// Kept free of @repo/pdf-client imports: this runs in the page's initial bundle (DropzoneShell),
// which must not pull in the registry or zod.
const MIB = 1024 * 1024;

/** Formats a byte count as megabytes in the given locale, e.g. "150 MB" or "١٥٠ ميغابايت". */
export function formatMegabytes(bytes: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: bytes < 10 * MIB ? 1 : 0,
  }).format(bytes / MIB);
}
