"""Split a PDF. Mirrors packages/pdf-client/src/engine/split.ts (same pages, same error codes).

`split_pdf` is the `extract` mode (one PDF); `split_pdf_ranges` and `split_pdf_every` are the
`ranges` and `every` modes (a list of PDFs, packed with `pdfcore.pack.pack_files`).
"""

from __future__ import annotations

import io

import pikepdf

from ..errors import EmptyDocumentError, InvalidPageRangeError, PageOutOfRangeError
from ..load import Source, open_pdf
from ..pages import PageRange, page_chunks, page_groups, page_indices, parse_page_ranges


def _parse(spec: str) -> list[PageRange]:
    ranges = parse_page_ranges(spec)
    if ranges is None:
        raise InvalidPageRangeError()
    return ranges


def _write(source: pikepdf.Pdf, indices: list[int], producer: str | None) -> bytes:
    """A new PDF with the given pages of `source`, which must stay open until this returns."""
    with pikepdf.new() as out:
        out.pages.extend(source.pages[i] for i in indices)
        if producer:
            with out.open_metadata(set_pikepdf_as_editor=False) as meta:
                meta["pdf:Producer"] = producer
                meta["xmp:CreatorTool"] = producer
        buffer = io.BytesIO()
        out.save(buffer, deterministic_id=True)
        return buffer.getvalue()


def _pages(pdf: pikepdf.Pdf) -> int:
    if len(pdf.pages) == 0:
        raise EmptyDocumentError(file_index=0)
    return len(pdf.pages)


def split_pdf(source: Source, pages: str, *, producer: str | None = None) -> bytes:
    """Copy the pages listed in `pages` ("1-3, 5, 8-") into a new PDF, in document order."""
    ranges = _parse(pages)
    with open_pdf(source, 0) as pdf:
        indices = page_indices(ranges, _pages(pdf))
        if indices is None:
            raise PageOutOfRangeError(file_index=0)
        return _write(pdf, indices, producer)


def split_pdf_ranges(source: Source, ranges: str, *, producer: str | None = None) -> list[bytes]:
    """One PDF per item of `ranges` ("1-3, 4-6, 7-"), in the order typed."""
    parsed = _parse(ranges)
    with open_pdf(source, 0) as pdf:
        groups = page_groups(parsed, _pages(pdf))
        if groups is None:
            raise PageOutOfRangeError(file_index=0)
        return [_write(pdf, indices, producer) for indices in groups]


def split_pdf_every(source: Source, every: int, *, producer: str | None = None) -> list[bytes]:
    """One PDF per `every` pages; the last one may have fewer."""
    if every < 1:
        raise ValueError(f"every must be at least 1, got {every}")
    with open_pdf(source, 0) as pdf:
        return [_write(pdf, indices, producer) for indices in page_chunks(_pages(pdf), every)]
