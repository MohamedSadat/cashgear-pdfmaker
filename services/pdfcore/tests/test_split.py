"""Split mirrors packages/pdf-client/src/engine/split.ts: same page syntax, same error codes."""

from __future__ import annotations

import io

import pikepdf
import pytest

from pdfcore.errors import (
    EmptyDocumentError,
    EncryptedInputError,
    InvalidPageRangeError,
    InvalidPdfError,
    PageOutOfRangeError,
)
from pdfcore.ops.split import split_pdf
from pdfcore.pages import page_indices, parse_page_ranges

A = "pdf/basic/a-3p-a4.pdf"
B = "pdf/basic/b-2p-letter.pdf"
C = "pdf/basic/c-1p-a5-rot90.pdf"


def widths(data: bytes) -> list[int]:
    with pikepdf.open(io.BytesIO(data)) as pdf:
        return [round(float(p.mediabox[2]) - float(p.mediabox[0])) for p in pdf.pages]


@pytest.fixture(scope="module")
def mixed(corpus) -> bytes:
    """A + B + C: six pages whose widths tell them apart (595 x3, 612 x2, 420 rotated)."""
    with pikepdf.new() as out:
        sources = [pikepdf.open(corpus(rel)) for rel in (A, B, C)]
        try:
            for source in sources:
                out.pages.extend(source.pages)
            buffer = io.BytesIO()
            out.save(buffer)
            return buffer.getvalue()
        finally:
            for source in sources:
                source.close()


class TestParsePageRanges:
    def test_reads_pages_ranges_and_open_ranges(self):
        assert parse_page_ranges("5") == [(5, 5)]
        assert parse_page_ranges("1-3") == [(1, 3)]
        assert parse_page_ranges("8-") == [(8, None)]
        assert parse_page_ranges(" 1 - 3 , 5,8- ") == [(1, 3), (5, 5), (8, None)]

    def test_accepts_arabic_digits_comma_and_dashes(self):
        assert parse_page_ranges("١-٣، ٥") == [(1, 3), (5, 5)]
        assert parse_page_ranges("۲-۴") == [(2, 4)]
        assert parse_page_ranges("1–3, 4—5") == [(1, 3), (4, 5)]

    def test_skips_empty_items(self):
        assert parse_page_ranges("1,,3,") == [(1, 1), (3, 3)]

    @pytest.mark.parametrize(
        "spec", ["", "  ", ",", "0", "0-2", "3-1", "-3", "1 2", "a", "1-2-3", "1.5", "1-x", "+1"]
    )
    def test_rejects(self, spec):
        assert parse_page_ranges(spec) is None


class TestPageIndices:
    def indices(self, spec: str, page_count: int) -> list[int] | None:
        return page_indices(parse_page_ranges(spec) or [], page_count)

    def test_document_order_without_duplicates(self):
        assert self.indices("1-3, 5", 6) == [0, 1, 2, 4]
        assert self.indices("5, 1-3, 2", 6) == [0, 1, 2, 4]

    def test_open_range_runs_to_the_end(self):
        assert self.indices("2-", 4) == [1, 2, 3]
        assert self.indices("3-", 3) == [2]

    def test_past_the_end_is_none(self):
        assert self.indices("2-9", 3) is None
        assert self.indices("4", 3) is None
        assert self.indices("4-", 3) is None
        assert self.indices("99999999999999999999", 3) is None


def test_extracts_in_document_order(mixed):
    assert widths(split_pdf(mixed, "4-5, 1")) == [595, 612, 612]
    assert widths(split_pdf(mixed, "6, 4, 4")) == [612, 420]


def test_open_range(mixed):
    assert widths(split_pdf(mixed, "4-")) == [612, 612, 420]


def test_accepts_bytes_and_paths(corpus):
    assert widths(split_pdf(corpus(B), "2")) == [612]
    assert widths(split_pdf(corpus(B).read_bytes(), "1-2")) == [612, 612]


def test_keeps_rotation(mixed):
    with pikepdf.open(io.BytesIO(split_pdf(mixed, "6"))) as pdf:
        assert int(pdf.pages[0].obj.get("/Rotate", 0)) == 90


def test_output_is_well_formed(mixed):
    with pikepdf.open(io.BytesIO(split_pdf(mixed, "2-5"))) as pdf:
        assert pdf.check_pdf_syntax() == []


def test_sets_producer(corpus):
    data = split_pdf(corpus(A), "1", producer="Test Brand")
    with pikepdf.open(io.BytesIO(data)) as pdf, pdf.open_metadata() as meta:
        assert meta.get("pdf:Producer") == "Test Brand"


def test_rejects_page_past_the_end(corpus):
    with pytest.raises(PageOutOfRangeError) as info:
        split_pdf(corpus(A), "2-9")
    assert info.value.file_index == 0
    assert info.value.code == "PAGE_OUT_OF_RANGE"


def test_rejects_malformed_pages(corpus):
    with pytest.raises(InvalidPageRangeError) as info:
        split_pdf(corpus(A), "3-1")
    assert info.value.code == "INVALID_PAGE_RANGE"


@pytest.mark.parametrize(
    "rel", ["pdf/edge/encrypted-user-pw.pdf", "pdf/edge/encrypted-owner-only.pdf"]
)
def test_rejects_encrypted(corpus, rel):
    with pytest.raises(EncryptedInputError) as info:
        split_pdf(corpus(rel), "1")
    assert info.value.file_index == 0


def test_rejects_empty(corpus):
    with pytest.raises(EmptyDocumentError) as info:
        split_pdf(corpus("pdf/edge/zero-pages.pdf"), "1")
    assert info.value.file_index == 0


@pytest.mark.parametrize("rel", ["pdf/edge/garbage-after-header.pdf", "pdf/edge/not-a-pdf.pdf"])
def test_rejects_invalid(corpus, rel):
    with pytest.raises(InvalidPdfError) as info:
        split_pdf(corpus(rel), "1")
    assert info.value.file_index == 0


def test_large_input(corpus):
    data = split_pdf(corpus("pdf/large/1200-pages.pdf"), "101-1100")
    with pikepdf.open(io.BytesIO(data)) as pdf:
        assert len(pdf.pages) == 1000
