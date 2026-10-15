"""Generate the synthetic PDF test corpus and testdata/manifest.json.

Run with the pdfcore venv (it has reportlab and pikepdf):

    services/pdfcore/.venv/Scripts/python.exe testdata/scripts/generate_corpus.py \
        [--arabic-font path/to/NotoNaskhArabic-Regular.ttf]

Everything is generated, so no third-party documents are committed. Encrypted files use random
salts and change on every run; regenerate only when adding fixtures. The Arabic fixture needs an
OFL-licensed TrueType font passed in with --arabic-font (the font itself is never committed).
Without it, the existing Arabic file and its manifest entry are kept as they are.

Note: reportlab does not shape Arabic, so letters appear unjoined. That is fine for operations
that copy pages byte for byte (merge, split). Shaped fixtures come later from LibreOffice output.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import pikepdf
from reportlab.lib.pagesizes import A4, A5, LETTER
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "pdf"
MANIFEST = ROOT / "manifest.json"
ARABIC_FILE = "pdf/text/arabic-2p.pdf"


def labelled_pdf(path: Path, label: str, pages: int, size: tuple[float, float]) -> None:
    """Pages labelled '<label>-<n>' in large text; page size doubles as an order signal."""
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=size, invariant=1)
    c.setTitle(f"Fixture {label}")
    for n in range(1, pages + 1):
        c.setFont("Helvetica-Bold", 48)
        c.drawCentredString(size[0] / 2, size[1] / 2, f"{label}-{n}")
        c.setFont("Helvetica", 12)
        c.drawString(36, 36, f"Test fixture {label}, page {n} of {pages}")
        c.showPage()
    c.save()


def rotated_pdf(path: Path) -> None:
    labelled_pdf(path, "C", 1, A5)
    with pikepdf.open(path, allow_overwriting_input=True) as pdf:
        pdf.pages[0].Rotate = 90
        pdf.save(path, deterministic_id=True)


def zero_page_pdf(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with pikepdf.new() as pdf:
        pdf.save(path, deterministic_id=True)


def encrypted_pdf(source: Path, path: Path, user: str) -> None:
    with pikepdf.open(source) as pdf:
        pdf.save(path, encryption=pikepdf.Encryption(user=user, owner="owner123", R=6))


def large_pdf(path: Path, pages: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with pikepdf.new() as pdf:
        for _ in range(pages):
            pdf.add_blank_page(page_size=A4)
        pdf.save(path, deterministic_id=True)


def arabic_pdf(path: Path, font_path: Path) -> None:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    pdfmetrics.registerFont(TTFont("ArabicFixture", str(font_path)))
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=A4, invariant=1)
    lines = ["مرحبا بالعالم", "هذا ملف اختبار باللغة العربية", "الصفحة"]
    for n in range(1, 3):
        c.setFont("ArabicFixture", 28)
        for i, line in enumerate(lines):
            text = f"{line} {n}" if i == len(lines) - 1 else line
            c.drawRightString(A4[0] - 72, A4[1] - 120 - i * 48, text)
        c.showPage()
    c.save()


def describe(path: Path, purpose: str, *, password: str = "", **extra: object) -> dict[str, object]:
    entry: dict[str, object] = {"purpose": purpose}
    try:
        with pikepdf.open(path, password=password) as pdf:
            entry["pages"] = len(pdf.pages)
            entry["encrypted"] = pdf.is_encrypted
            if len(pdf.pages):
                box = pdf.pages[0].mediabox
                entry["firstPageSize"] = [
                    round(float(box[2]) - float(box[0]), 2),
                    round(float(box[3]) - float(box[1]), 2),
                ]
    except pikepdf.PasswordError:
        entry["encrypted"] = True
    except pikepdf.PdfError:
        pass
    entry.update(extra)
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--arabic-font", type=Path, help="OFL TrueType font with Arabic glyphs")
    args = parser.parse_args()

    old = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"files": {}}
    files: dict[str, dict[str, object]] = {}

    def p(rel: str) -> Path:
        return ROOT / rel

    labelled_pdf(p("pdf/basic/a-3p-a4.pdf"), "A", 3, A4)
    files["pdf/basic/a-3p-a4.pdf"] = describe(p("pdf/basic/a-3p-a4.pdf"), "3 labelled A4 pages")

    labelled_pdf(p("pdf/basic/b-2p-letter.pdf"), "B", 2, LETTER)
    files["pdf/basic/b-2p-letter.pdf"] = describe(
        p("pdf/basic/b-2p-letter.pdf"), "2 labelled US Letter pages"
    )

    rotated_pdf(p("pdf/basic/c-1p-a5-rot90.pdf"))
    files["pdf/basic/c-1p-a5-rot90.pdf"] = describe(
        p("pdf/basic/c-1p-a5-rot90.pdf"), "1 A5 page with /Rotate 90", rotate=90
    )

    zero_page_pdf(p("pdf/edge/zero-pages.pdf"))
    files["pdf/edge/zero-pages.pdf"] = describe(
        p("pdf/edge/zero-pages.pdf"),
        "valid PDF with an empty page tree",
        expectError="EMPTY_DOCUMENT",
    )

    encrypted_pdf(p("pdf/basic/a-3p-a4.pdf"), p("pdf/edge/encrypted-user-pw.pdf"), "user123")
    files["pdf/edge/encrypted-user-pw.pdf"] = describe(
        p("pdf/edge/encrypted-user-pw.pdf"),
        "AES-256 (R6), needs the user password 'user123'",
        password="user123",
        expectError="ENCRYPTED",
    )

    encrypted_pdf(p("pdf/basic/a-3p-a4.pdf"), p("pdf/edge/encrypted-owner-only.pdf"), "")
    files["pdf/edge/encrypted-owner-only.pdf"] = describe(
        p("pdf/edge/encrypted-owner-only.pdf"),
        "AES-256 (R6), owner password only (opens freely)",
        expectError="ENCRYPTED",
    )

    p("pdf/edge/not-a-pdf.pdf").write_bytes(b"This is plain text with a .pdf extension.\n")
    files["pdf/edge/not-a-pdf.pdf"] = {
        "purpose": "plain text renamed to .pdf",
        "sniff": None,
        "expectError": "INVALID_PDF",
    }

    rng = random.Random(20261015)
    garbage = b"%PDF-1.7\n" + bytes(rng.getrandbits(8) for _ in range(4096))
    p("pdf/edge/garbage-after-header.pdf").write_bytes(garbage)
    files["pdf/edge/garbage-after-header.pdf"] = {
        "purpose": "PDF header followed by random bytes",
        "expectError": "INVALID_PDF",
    }

    large_pdf(p("pdf/large/1200-pages.pdf"), 1200)
    files["pdf/large/1200-pages.pdf"] = describe(
        p("pdf/large/1200-pages.pdf"), "1,200 blank A4 pages"
    )

    if args.arabic_font:
        arabic_pdf(p(ARABIC_FILE), args.arabic_font)
        files[ARABIC_FILE] = describe(
            p(ARABIC_FILE),
            "2 pages of Arabic text with an embedded TrueType subset",
            hasEmbeddedFont=True,
        )
    elif ARABIC_FILE in old["files"] and p(ARABIC_FILE).exists():
        files[ARABIC_FILE] = old["files"][ARABIC_FILE]
    else:
        print(f"warning: {ARABIC_FILE} not generated (pass --arabic-font)", file=sys.stderr)

    manifest = {
        "$comment": "Generated by testdata/scripts/generate_corpus.py. Do not edit by hand.",
        "files": dict(sorted(files.items())),
    }
    MANIFEST.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"wrote {len(files)} fixtures and {MANIFEST.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
