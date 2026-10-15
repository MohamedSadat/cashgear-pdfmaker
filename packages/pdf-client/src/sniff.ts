/** File kinds the registry can accept or produce. */
export type FileKind = 'pdf' | 'png' | 'jpeg' | 'docx' | 'xlsx' | 'pptx' | 'zip';

/** How many leading bytes sniffing needs. */
export const SNIFF_BYTES = 1024;

export const FILE_KIND_INFO: Record<FileKind, { mime: string; extensions: readonly string[] }> = {
  pdf: { mime: 'application/pdf', extensions: ['.pdf'] },
  png: { mime: 'image/png', extensions: ['.png'] },
  jpeg: { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['.docx'],
  },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extensions: ['.xlsx'],
  },
  pptx: {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extensions: ['.pptx'],
  },
  // Output only (several files from one run). Never accepted: sniffBytes doesn't return it.
  zip: { mime: 'application/zip', extensions: ['.zip'] },
};

/** Value for an `<input type="file" accept>` attribute. */
export function acceptAttribute(kinds: readonly FileKind[]): string {
  return kinds.flatMap((k) => [FILE_KIND_INFO[k].mime, ...FILE_KIND_INFO[k].extensions]).join(',');
}

const PDF_MARKER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((b, i) => bytes[offset + i] === b);
}

/**
 * Detects a file's real type from its first bytes, never from its extension alone.
 * PDFs may carry junk before the header (Acrobat accepts the marker anywhere in the first
 * 1024 bytes), so the marker is searched for. Office files are ZIP containers; the extension
 * only picks which OOXML kind a verified ZIP is.
 */
export function sniffBytes(head: Uint8Array, fileName?: string): FileKind | null {
  const limit = Math.min(head.length, SNIFF_BYTES) - PDF_MARKER.length;
  for (let i = 0; i <= limit; i++) {
    if (startsWith(head, PDF_MARKER, i)) return 'pdf';
  }
  if (startsWith(head, PNG_SIGNATURE)) return 'png';
  if (startsWith(head, JPEG_SIGNATURE)) return 'jpeg';
  if (startsWith(head, ZIP_SIGNATURE) && fileName) {
    const lower = fileName.toLowerCase();
    for (const kind of ['docx', 'xlsx', 'pptx'] as const) {
      if (lower.endsWith(`.${kind}`)) return kind;
    }
  }
  return null;
}

/** Reads only the first SNIFF_BYTES of a File/Blob. */
export async function sniffFile(file: Blob & { name?: string }): Promise<FileKind | null> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  return sniffBytes(head, file.name);
}
