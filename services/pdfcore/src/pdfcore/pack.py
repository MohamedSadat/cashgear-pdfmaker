"""Packing a run's files. Mirrors execute() and partFileName in packages/pdf-client (same names)."""

from __future__ import annotations

import io
import zipfile
from collections.abc import Sequence
from typing import Literal

OutputKind = Literal["pdf", "zip"]


def part_file_name(base: str, index: int, count: int) -> str:
    """`<base>-1.pdf` for index 0, zero-padded to the digits of `count` so names sort in order."""
    return f"{base}-{str(index + 1).zfill(len(str(count)))}.pdf"


def pack_files(files: Sequence[bytes], base: str) -> tuple[bytes, OutputKind]:
    """One PDF comes back as it is; two or more become one ZIP of `<base>-<n>.pdf` entries.

    `base` must already be a safe file name (the caller sanitizes the user's name). Entries are
    stored, not deflated, because PDF streams are compressed already; zipfile flags non-ASCII
    names as UTF-8.
    """
    if not files:
        raise ValueError("no files to pack")
    if len(files) == 1:
        return files[0], "pdf"
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_STORED) as archive:
        for index, data in enumerate(files):
            archive.writestr(part_file_name(base, index, len(files)), data)
    return buffer.getvalue(), "zip"
