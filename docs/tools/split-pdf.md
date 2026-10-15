# Split PDF

First version: **extract pages**. The user types the pages to keep and gets one new PDF with
those pages. Splitting one file into several files (one per range, or every N pages) needs a ZIP
download and is left for a later version (see "Not in this version").

## Tool: Split PDF (slug: split-pdf)

Runs: browser (pdfcore mirror for the desktop sidecar and server fallback later)
Input: PDF only, checked by magic bytes; exactly 1 file; at most 150 MiB
Options:

- `pages`, string, required (no default), max 500 characters. Page numbers and ranges separated
  by commas, such as `1-3, 5, 8-`. The action stays disabled until it is valid.
- `outputName`, string, default `''` (max 100 characters), as in Merge.

Output: one PDF named by `outputFileName`: the sanitized `outputName` plus `.pdf`, else
`extracted-pages.pdf`. Producer and Creator metadata are set to the brand name.
Edge cases: encrypted input, 0-page file, 1,000+ pages, Arabic text

### Page syntax

Parsed by `parsePageRanges` in `@repo/pdf-client` (safe everywhere, also used by the option
schema) and by `pdfcore.pages.parse_page_ranges` in Python. Both follow these rules:

| Input                               | Meaning                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| `5`                                 | page 5                                                    |
| `1-3`                               | pages 1, 2 and 3                                          |
| `8-`                                | page 8 to the last page                                   |
| `1-3, 5, 8-`                        | items separated by commas; spaces around them are ignored |
| `١-٣، ٥`                            | Arabic-Indic digits and the Arabic comma are accepted     |
| `1–3`                               | an en dash or em dash works like a hyphen                 |
| `1,,3,`                             | empty items are skipped (lets the user type freely)       |
| empty, `0`, `3-1`, `-3`, `1 2`, `a` | invalid: `INVALID_PAGE_RANGE`, the action stays disabled  |

Pages are written in document order with duplicates removed: `5, 1-3, 2` gives pages 1, 2, 3, 5.
Reordering pages is the job of a future Organize tool, not of Split.

### Behavior

| Case                                   | Behavior                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Encrypted file (user or owner)         | `ENCRYPTED` with `fileIndex` 0; the UI names the file                           |
| File with 0 pages                      | `EMPTY_DOCUMENT` with `fileIndex` 0                                             |
| Unparsable file with a PDF header      | `INVALID_PDF` with `fileIndex` 0                                                |
| Not a PDF at all                       | rejected when added (`UNSUPPORTED_TYPE`), never listed                          |
| No file, or the pages field empty      | action disabled; hint "Enter the pages you want to extract."                    |
| Pages field not valid                  | action disabled; message under the field                                        |
| A page past the end (`2-9` on 3 pages) | `PAGE_OUT_OF_RANGE` with `fileIndex` 0; the UI names the file                   |
| A second file                          | the "Add more files" button is hidden; a drop of 2 files shows `TOO_MANY_FILES` |
| Over 150 MiB                           | `TOO_LARGE`, action disabled                                                    |
| 1,000+ pages                           | supported; one copy pass, no per-page work on the main thread                   |
| Arabic text                            | preserved: fonts and ToUnicode maps are copied with the pages                   |
| Page rotation                          | preserved (`/Rotate` is copied with each page)                                  |

Known limitation (stated in the FAQ): bookmarks and fillable form fields are not carried over,
because pages are copied without the document-level outline and AcroForm (same as Merge).

New error codes (TypeScript `PDF_ERROR_CODES`, Python `PdfErrorCode`, and `ui.errors` in both
languages): `INVALID_PAGE_RANGE`, `PAGE_OUT_OF_RANGE`.

### Shared UI changes this tool needs

- Options without a default are **required**: the form starts them empty (`initialOptions`), marks
  the input `required`, keeps the action disabled until the whole schema passes, shows
  `ui.tools.<id>.options.<field>.required` as the hint while the field is empty, and
  `ui.tools.<id>.options.<field>.invalid` under the field while its value is not valid.
- Tools with `maxFiles: 1` hide the compact "Add more files" button, and the dropzone reads
  "Drop a file here" / "Choose file" / "One file, up to {maxSize}".

Memory: same model as Merge. The file is read only when the user clicks the action, transferred
to a fresh Web Worker that is terminated afterwards, and only the result Blob is kept.

### Not in this version

- **Split into several files** (every N pages, or one file per range). The output would be a ZIP.
  A ZIP writer such as fflate (MIT, on the allow-list) would be the one new dependency; it is left
  out to keep this version small. The FAQ says "Not yet".
- Page thumbnails to pick pages visually. Needs a renderer (pdf.js, Apache-2.0) and is its own task.

Acceptance:

- [x] registry entry + EN and AR page copy
- [x] pdf-client or pdfcore operation with unit tests on testdata/
- [x] Playwright test: upload, run, download, verify
- [x] no new dependency outside the license allow-list
