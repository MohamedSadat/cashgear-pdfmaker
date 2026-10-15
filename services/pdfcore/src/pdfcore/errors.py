"""Typed errors. Codes match `PdfErrorCode` in packages/pdf-client/src/errors.ts."""

from __future__ import annotations

from typing import Literal

PdfErrorCode = Literal[
    "UNSUPPORTED_TYPE",
    "INVALID_PDF",
    "ENCRYPTED",
    "EMPTY_DOCUMENT",
    "INVALID_PAGE_RANGE",
    "PAGE_OUT_OF_RANGE",
    "TOO_FEW_FILES",
    "TOO_MANY_FILES",
    "TOO_LARGE",
    "ABORTED",
    "UNKNOWN",
]


class PdfCoreError(Exception):
    """Base error carrying a stable code and, when one input caused it, that input's index."""

    code: PdfErrorCode = "UNKNOWN"

    def __init__(self, message: str | None = None, *, file_index: int | None = None) -> None:
        super().__init__(message or self.code)
        self.file_index = file_index

    def to_dict(self) -> dict[str, object]:
        data: dict[str, object] = {"code": self.code, "message": str(self)}
        if self.file_index is not None:
            data["fileIndex"] = self.file_index
        return data


class InvalidPdfError(PdfCoreError):
    code = "INVALID_PDF"


class EncryptedInputError(PdfCoreError):
    code = "ENCRYPTED"


class EmptyDocumentError(PdfCoreError):
    code = "EMPTY_DOCUMENT"


class InvalidPageRangeError(PdfCoreError):
    code = "INVALID_PAGE_RANGE"


class PageOutOfRangeError(PdfCoreError):
    code = "PAGE_OUT_OF_RANGE"


class TooFewFilesError(PdfCoreError):
    code = "TOO_FEW_FILES"
