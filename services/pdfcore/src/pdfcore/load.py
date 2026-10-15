"""Opening inputs. Mirrors packages/pdf-client/src/engine/load.ts (same error codes)."""

from __future__ import annotations

import io
from pathlib import Path

import pikepdf

from .errors import EncryptedInputError, InvalidPdfError

Source = bytes | Path


def open_pdf(source: Source, index: int) -> pikepdf.Pdf:
    """Open one input; failures become typed errors carrying the input's index."""
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
