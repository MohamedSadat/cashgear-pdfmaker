"""Merge PDFs. Mirrors packages/pdf-client/src/engine/merge.ts (same order, same error codes)."""

from __future__ import annotations

import io
from collections.abc import Sequence

import pikepdf

from ..errors import EmptyDocumentError, TooFewFilesError
from ..load import Source, open_pdf


def merge_pdfs(sources: Sequence[Source], *, producer: str | None = None) -> bytes:
    """Concatenate the pages of every source, in order, and return the new PDF's bytes."""
    if len(sources) < 2:
        raise TooFewFilesError()
    opened: list[pikepdf.Pdf] = []
    try:
        with pikepdf.new() as out:
            for index, source in enumerate(sources):
                pdf = open_pdf(source, index)
                opened.append(pdf)
                if len(pdf.pages) == 0:
                    raise EmptyDocumentError(file_index=index)
                out.pages.extend(pdf.pages)
            if producer:
                with out.open_metadata(set_pikepdf_as_editor=False) as meta:
                    meta["pdf:Producer"] = producer
                    meta["xmp:CreatorTool"] = producer
            buffer = io.BytesIO()
            # Sources must stay open until save() has copied their objects.
            out.save(buffer, deterministic_id=True)
            return buffer.getvalue()
    finally:
        for pdf in opened:
            pdf.close()
