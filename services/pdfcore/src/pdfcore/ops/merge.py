"""Merge PDFs. Mirrors packages/pdf-client/src/engine/merge.ts (same order, same error codes)."""

from __future__ import annotations

import io
from collections.abc import Sequence
from pathlib import Path

import pikepdf

from ..errors import EmptyDocumentError, EncryptedInputError, InvalidPdfError, TooFewFilesError

Source = bytes | Path


def _open(source: Source, index: int) -> pikepdf.Pdf:
    data = io.BytesIO(source) if isinstance(source, bytes) else source
    try:
        pdf = pikepdf.open(data)
    except pikepdf.PasswordError as e:
        raise EncryptedInputError(file_index=index) from e
    except pikepdf.PdfError as e:
        raise InvalidPdfError(file_index=index) from e
    if pdf.is_encrypted:
        # Owner-password-only files open freely; reject them anyway, like the browser engine.
        pdf.close()
        raise EncryptedInputError(file_index=index)
    return pdf


def merge_pdfs(sources: Sequence[Source], *, producer: str | None = None) -> bytes:
    """Concatenate the pages of every source, in order, and return the new PDF's bytes."""
    if len(sources) < 2:
        raise TooFewFilesError()
    opened: list[pikepdf.Pdf] = []
    try:
        with pikepdf.new() as out:
            for index, source in enumerate(sources):
                pdf = _open(source, index)
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
