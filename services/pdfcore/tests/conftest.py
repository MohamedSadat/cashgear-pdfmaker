from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

TESTDATA = Path(__file__).resolve().parents[3] / "testdata"
LFS_POINTER_PREFIX = b"version https://git-lfs"


def corpus_path(rel: str) -> Path:
    """Path to a corpus file; fails loudly when Git LFS left a pointer instead of the PDF."""
    path = TESTDATA / rel
    if not path.exists():
        pytest.fail(
            f"missing corpus file {rel}; regenerate with testdata/scripts/generate_corpus.py"
        )
    with path.open("rb") as f:
        if f.read(len(LFS_POINTER_PREFIX)) == LFS_POINTER_PREFIX:
            pytest.fail(f"{rel} is a Git LFS pointer; run `git lfs pull`")
    return path


@pytest.fixture(scope="session")
def corpus():
    """`corpus("pdf/basic/a-3p-a4.pdf")` returns a checked path to that fixture."""
    return corpus_path


@pytest.fixture(scope="session")
def manifest() -> dict[str, dict[str, Any]]:
    data = json.loads((TESTDATA / "manifest.json").read_text(encoding="utf-8"))
    return data["files"]
