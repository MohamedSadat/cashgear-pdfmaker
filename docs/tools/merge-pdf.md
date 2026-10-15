# Merge PDF

This is the reference tool: later tools copy its pattern in every folder (registry entry, engine
operation, pdfcore op, UI mount, page copy, tests).

## Tool: Merge PDF (slug: merge-pdf)

Runs: browser (pdfcore mirror for the desktop sidecar and server fallback later)
Input: PDF only, checked by magic bytes; 2 to 50 files; at most 150 MiB combined
Options: `outputName`, string, default `''` (max 100 characters). File order is the list order the
user sets by dragging or with the Move up / Move down buttons; it is not an option.
Output: one PDF named by `outputFileName`: the sanitized `outputName` plus `.pdf`, else
`merged.pdf`. Producer and Creator metadata are set to the brand name.
Edge cases: encrypted input, 0-page file, 1,000+ pages, Arabic text

| Case                               | Behavior                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| Any encrypted file (user or owner) | `ENCRYPTED` with `fileIndex`; the UI names the file       |
| A file with 0 pages                | `EMPTY_DOCUMENT` with `fileIndex`                         |
| Unparsable file with a PDF header  | `INVALID_PDF` with `fileIndex`                            |
| Not a PDF at all                   | rejected when added (`UNSUPPORTED_TYPE`), never listed    |
| Fewer than 2 files                 | action disabled, hint "Add at least 2 files"              |
| Over 50 files or 150 MiB           | `TOO_MANY_FILES` / `TOO_LARGE`, action disabled           |
| 1,000+ pages                       | supported; progress reported per file                     |
| Arabic text                        | preserved: fonts and ToUnicode maps are copied with pages |
| Page rotation                      | preserved (`/Rotate` is copied with each page)            |

Known limitation (stated in the FAQ): bookmarks and fillable form fields from the inputs are not
carried over, because pages are copied without the document-level outline and AcroForm.

Memory: file bytes are read only when the user clicks the action, transferred (not copied) to a
fresh Web Worker that is terminated afterwards, and only the result Blob is kept. Peak memory is
roughly 3-4x the input, which is why the browser limit is 150 MiB.

Acceptance:

- [x] registry entry + EN and AR page copy
- [x] pdf-client or pdfcore operation with unit tests on testdata/
- [x] Playwright test: upload, run, download, verify
- [x] no new dependency outside the license allow-list
