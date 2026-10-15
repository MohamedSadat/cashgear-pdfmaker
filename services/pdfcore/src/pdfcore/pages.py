"""Page lists such as "1-3, 5, 8-". Mirrors packages/pdf-client/src/pages.ts (same rules)."""

from __future__ import annotations

import re

PageRange = tuple[int, int | None]
"""1-based and inclusive; the end is None for "to the last page"."""

# Arabic-Indic (U+0660-0669) and Extended Arabic-Indic (U+06F0-06F9, Persian and Urdu) digits.
_ASCII_DIGITS = str.maketrans(
    {chr(base + d): str(d) for base in (0x0660, 0x06F0) for d in range(10)}
)
# Comma and Arabic comma.
_SEPARATOR = re.compile("[,\u060c]")
# "5", "1-3" or "8-"; hyphen, en dash or em dash. ASCII digits only, like \d in JavaScript.
_ITEM = re.compile("([0-9]+)\\s*(?:[-\u2013\u2014]\\s*([0-9]*))?")


def parse_page_ranges(spec: str) -> list[PageRange] | None:
    """Parse a page list; None when it has no item or an item is malformed (0, "3-1", "a")."""
    ranges: list[PageRange] = []
    for raw in _SEPARATOR.split(spec.translate(_ASCII_DIGITS)):
        item = raw.strip()
        if not item:
            continue
        match = _ITEM.fullmatch(item)
        if not match:
            return None
        start = int(match[1])
        end = start if match[2] is None else (int(match[2]) if match[2] else None)
        if start < 1 or (end is not None and end < start):
            return None
        ranges.append((start, end))
    return ranges or None


def page_indices(ranges: list[PageRange], page_count: int) -> list[int] | None:
    """0-based indices in document order without duplicates; None when a page is past the end."""
    selected: set[int] = set()
    for start, end in ranges:
        last = page_count if end is None else end
        if start > page_count or last > page_count:
            return None
        selected.update(range(start - 1, last))
    return sorted(selected)
