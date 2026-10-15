# Split PDF

Three modes. **Extract pages** (the default) puts the pages the user lists into one new PDF.
**One PDF per range** and **One PDF every N pages** split one file into several PDFs, downloaded
together as one ZIP.

## Tool: Split PDF (slug: split-pdf)

Runs: browser (pdfcore mirror for the desktop sidecar and server fallback later)
Input: PDF only, checked by magic bytes; exactly 1 file; at most 150 MiB
Options:

- `mode`, enum `extract | ranges | every`, default `extract`. Shown as a select.
- `pages`, string, required in `extract` mode (no default), max 500 characters. Page numbers and
  ranges separated by commas, such as `1-3, 5, 8-`. Hidden in the other modes.
- `ranges`, string, required in `ranges` mode (no default), max 500 characters. Same syntax; each
  comma-separated item becomes one PDF. Hidden in the other modes.
- `every`, integer, default `1`, at least 1. Pages per PDF in `every` mode. Hidden in the other
  modes.
- `outputName`, string, default `''` (max 100 characters), as in Merge. It names the PDF, or the
  ZIP and the PDFs inside it.

An option that is hidden in the current mode is not validated, and the run gets its initial value,
so a value typed before switching mode can neither block the run nor reach it. The schema itself
(also checked in the worker) requires `pages` only in `extract` mode and `ranges` only in `ranges`
mode.

Output:

| Mode      | Result                                                           |
| --------- | ---------------------------------------------------------------- |
| `extract` | one PDF                                                          |
| `ranges`  | one PDF per range, in the order typed                            |
| `every`   | one PDF per `every` pages; the last one may have fewer           |
| any       | when the run yields exactly one PDF, it downloads as a plain PDF |
| any       | when it yields two or more, they download together as one ZIP    |

Names (`outputFileName`, `outputBaseName` and `partFileName` in `@repo/pdf-client`):

- A plain PDF is named as before: the sanitized `outputName` plus `.pdf`, else
  `extracted-pages.pdf`. This includes `ranges` with one range and `every` with N at least the
  page count.
- A ZIP is named `<base>.zip`, where `<base>` is the sanitized `outputName` without a trailing
  `.zip` or `.pdf`, else `split`. Its PDFs sit at the root of the ZIP as `<base>-<n>.pdf`, with
  `n` counted from 1 and zero-padded to the digits of the part count so the names sort in order:
  `split-1.pdf` … `split-3.pdf`, or `split-01.pdf` … `split-12.pdf`.
- ZIP entries are stored, not deflated (PDF streams are compressed already), and names are UTF-8
  with the UTF-8 flag set, so an Arabic `outputName` shows correctly when unzipped.

Producer and Creator metadata of every PDF are set to the brand name.
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

In `extract` mode pages are written in document order with duplicates removed: `5, 1-3, 2` gives
pages 1, 2, 3, 5. Reordering pages is the job of a future Organize tool, not of Split.

In `ranges` mode each item is one PDF, in the order typed, with its pages in document order:
`5, 1-3` gives a PDF with page 5, then a PDF with pages 1 to 3. Overlapping or repeated items are
allowed; each still gets its own PDF. The groups come from `pageGroups` (`ranges`) and
`pageChunks` (`every`), `page_groups` and `page_chunks` in Python.

### Behavior

| Case                                   | Behavior                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Encrypted file (user or owner)         | `ENCRYPTED` with `fileIndex` 0; the UI names the file                           |
| File with 0 pages                      | `EMPTY_DOCUMENT` with `fileIndex` 0                                             |
| Unparsable file with a PDF header      | `INVALID_PDF` with `fileIndex` 0                                                |
| Not a PDF at all                       | rejected when added (`UNSUPPORTED_TYPE`), never listed                          |
| No file                                | action disabled                                                                 |
| `pages` or `ranges` empty (its mode)   | action disabled; its `.required` hint, such as "Enter the pages to extract."    |
| `pages` or `ranges` not valid          | action disabled; message under the field                                        |
| `every` empty                          | action disabled; hint "Enter how many pages each PDF should have."              |
| `every` 0, negative or not whole       | action disabled; message under the field                                        |
| `every` at least the page count        | one PDF with every page, downloaded as a plain PDF                              |
| A page past the end (`2-9` on 3 pages) | `PAGE_OUT_OF_RANGE` with `fileIndex` 0, in `extract` and `ranges` mode          |
| A second file                          | the "Add more files" button is hidden; a drop of 2 files shows `TOO_MANY_FILES` |
| Over 150 MiB                           | `TOO_LARGE`, action disabled                                                    |
| 1,000+ pages                           | supported; `every` 1 on 1,200 pages gives a ZIP of 1,200 PDFs                   |
| Arabic text                            | preserved: fonts and ToUnicode maps are copied with the pages                   |
| Page rotation                          | preserved (`/Rotate` is copied with each page)                                  |

Progress: one `process` step per PDF written ("Processing file 2 of 12…"), then `save` while the
last PDF is finished and the ZIP is packed.

Known limitations (stated in the FAQ): bookmarks and fillable form fields are not carried over,
because pages are copied without the document-level outline and AcroForm (same as Merge). Fonts
shared by many pages are copied into each PDF, so the PDFs of a ZIP together can be larger than
the original.

### Shared changes this version needs

- **ZIP output.** `FileKind` gains `zip` (`application/zip`, `.zip`). An engine operation returns
  one file or a list of files. `execute` (in the worker and the main-thread fallback alike)
  returns a list of one as that file and packs two or more into a ZIP with fflate, naming them
  with `partFileName`. `runTool` resolves to `{ bytes, kind }`. The UI takes the download's MIME
  type from `FILE_KIND_INFO[kind]` and its name from `outputFileName(output, name, kind)`.
  `ToolOutput.zipBaseName` is the default base name of a ZIP (`split` here).
- **Conditional options.** `ToolDefinition.conditionalOptions` maps an option to the values other
  options must have for it to apply, such as `every: { mode: ['every'] }`. `optionApplies` and
  `effectiveOptions` in `@repo/pdf-client` read it. The form hides options that don't apply, and
  validation and the run use `effectiveOptions`.
- **Number options.** `OptionsForm` renders `integer` and `number` options as a number input with
  the schema's minimum and maximum. An empty field is stored as `''`: like an empty required text
  option it shows `.required` as the hint, and an invalid value shows `.invalid` under the field.

From the first version, still in place:

- Options without a default are **required**: the form starts them empty (`initialOptions`), marks
  the input `required`, keeps the action disabled until the whole schema passes, shows
  `ui.tools.<id>.options.<field>.required` as the hint while the field is empty, and
  `ui.tools.<id>.options.<field>.invalid` under the field while its value is not valid.
- Tools with `maxFiles: 1` hide the compact "Add more files" button, and the dropzone reads
  "Drop a file here" / "Choose file" / "One file, up to {maxSize}".

Memory: same model as Merge. The file is read only when the user clicks the action, transferred
to a fresh Web Worker that is terminated afterwards, and only the result Blob is kept. While a
ZIP is packed, the worker holds the source, the finished PDFs and the ZIP at once.

### Python mirror (`services/pdfcore`)

- `split_pdf(source, pages)` returns one PDF (`extract`), as before.
- `split_pdf_ranges(source, ranges)` and `split_pdf_every(source, every)` return a list of PDFs.
- `pack_files(files, base)` mirrors the runner: one file comes back as `(bytes, "pdf")`, two or
  more as a stored ZIP `(bytes, "zip")` with the same `<base>-<n>.pdf` names.

### Not in this version

- Splitting by bookmarks or by file size.
- Page thumbnails to pick pages visually. Needs a renderer (pdf.js, Apache-2.0) and is its own task.

Acceptance:

- [x] registry entry + EN and AR page copy
- [x] pdf-client or pdfcore operation with unit tests on testdata/
- [x] Playwright test: upload, run, download, verify
- [x] no new dependency outside the license allow-list (fflate 0.8.3, MIT, no dependencies)
- [x] `ranges` and `every` modes with a ZIP download: Vitest, pytest, Playwright (en and ar)
