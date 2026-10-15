"""Extract pages. Mirrors packages/pdf-client/src/engine/split.ts (same pages, same error codes)."""

from __future__ import annotations

import io

import pikepdf

from ..errors import EmptyDocumentError, InvalidPageRangeError, PageOutOfRangeError
from ..load import Source, open_pdf
from ..pages import page_indices, parse_page_ranges


def split_pdf(source: Source, pages: str, *, producer: str | None = None) -> bytes:
    """Copy the pages listed in `pages` ("1-3, 5, 8-") into a new PDF, in document order."""
    ranges = parse_page_ranges(pages)
    if ranges is None:
        raise InvalidPageRangeError()
    with open_pdf(source, 0) as pdf:
        if len(pdf.pages) == 0:
            raise EmptyDocumentError(file_index=0)
        indices = page_indices(ranges, len(pdf.pages))
        if indices is None:
            raise PageOutOfRangeError(file_index=0)
        with pikepdf.new() as out:
            out.pages.extend(pdf.pages[i] for i in indices)
            if producer:
                with out.open_metadata(set_pikepdf_as_editor=False) as meta:
                    meta["pdf:Producer"] = producer
                    meta["xmp:CreatorTool"] = producer
            buffer = io.BytesIO()
            # The source must stay open until save() has copied its objects.
            out.save(buffer, deterministic_id=True)
            return buffer.getvalue()
