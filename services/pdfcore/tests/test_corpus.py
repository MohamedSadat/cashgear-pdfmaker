"""The corpus on disk matches testdata/manifest.json."""

from __future__ import annotations

import pikepdf
import pytest


def test_manifest_lists_fixtures(manifest):
    assert len(manifest) >= 9


def test_every_fixture_matches_manifest(manifest, corpus):
    for rel, entry in manifest.items():
        path = corpus(rel)
        if "pages" not in entry:
            with pytest.raises(pikepdf.PdfError):
                pikepdf.open(path).close()
            continue
        password = "user123" if "user-pw" in rel else ""
        with pikepdf.open(path, password=password) as pdf:
            assert len(pdf.pages) == entry["pages"], rel
            assert pdf.is_encrypted == entry["encrypted"], rel
            if entry.get("firstPageSize"):
                box = pdf.pages[0].mediabox
                size = [
                    round(float(box[2]) - float(box[0]), 2),
                    round(float(box[3]) - float(box[1]), 2),
                ]
                assert size == entry["firstPageSize"], rel


def test_user_password_fixture_needs_password(corpus):
    with pytest.raises(pikepdf.PasswordError):
        pikepdf.open(corpus("pdf/edge/encrypted-user-pw.pdf")).close()
