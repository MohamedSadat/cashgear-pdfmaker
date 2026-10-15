"""Merge mirrors packages/pdf-client/src/engine/merge.ts: same order, same error codes."""

from __future__ import annotations

import io

import pikepdf
import pytest

from pdfcore.errors import (
    EmptyDocumentError,
    EncryptedInputError,
    InvalidPdfError,
    TooFewFilesError,
)
from pdfcore.ops.merge import merge_pdfs

A = "pdf/basic/a-3p-a4.pdf"
B = "pdf/basic/b-2p-letter.pdf"
C = "pdf/basic/c-1p-a5-rot90.pdf"


def widths(data: bytes) -> list[int]:
    with pikepdf.open(io.BytesIO(data)) as pdf:
        return [round(float(p.mediabox[2]) - float(p.mediabox[0])) for p in pdf.pages]


def test_concatenates_in_order(corpus):
    assert widths(merge_pdfs([corpus(A), corpus(B)])) == [595, 595, 595, 612, 612]
    assert widths(merge_pdfs([corpus(B), corpus(A)])) == [612, 612, 595, 595, 595]


def test_accepts_bytes_and_paths(corpus):
    assert len(widths(merge_pdfs([corpus(A).read_bytes(), corpus(B)]))) == 5


def test_keeps_rotation(corpus):
    with pikepdf.open(io.BytesIO(merge_pdfs([corpus(A), corpus(C)]))) as pdf:
        assert int(pdf.pages[3].obj.get("/Rotate", 0)) == 90


def test_output_is_well_formed(corpus):
    with pikepdf.open(io.BytesIO(merge_pdfs([corpus(A), corpus(B)]))) as pdf:
        assert pdf.check_pdf_syntax() == []


def test_sets_producer(corpus):
    data = merge_pdfs([corpus(A), corpus(B)], producer="Test Brand")
    with pikepdf.open(io.BytesIO(data)) as pdf, pdf.open_metadata() as meta:
        assert meta.get("pdf:Producer") == "Test Brand"


def test_needs_two_files(corpus):
    with pytest.raises(TooFewFilesError):
        merge_pdfs([corpus(A)])


@pytest.mark.parametrize(
    "rel", ["pdf/edge/encrypted-user-pw.pdf", "pdf/edge/encrypted-owner-only.pdf"]
)
def test_rejects_encrypted(corpus, rel):
    with pytest.raises(EncryptedInputError) as info:
        merge_pdfs([corpus(A), corpus(rel)])
    assert info.value.file_index == 1
    assert info.value.code == "ENCRYPTED"


def test_rejects_empty(corpus):
    with pytest.raises(EmptyDocumentError) as info:
        merge_pdfs([corpus("pdf/edge/zero-pages.pdf"), corpus(A)])
    assert info.value.file_index == 0


@pytest.mark.parametrize("rel", ["pdf/edge/garbage-after-header.pdf", "pdf/edge/not-a-pdf.pdf"])
def test_rejects_invalid(corpus, rel):
    with pytest.raises(InvalidPdfError) as info:
        merge_pdfs([corpus(A), corpus(rel)])
    assert info.value.file_index == 1


def test_large_input(corpus):
    data = merge_pdfs([corpus("pdf/large/1200-pages.pdf"), corpus(B)])
    with pikepdf.open(io.BytesIO(data)) as pdf:
        assert len(pdf.pages) == 1202
