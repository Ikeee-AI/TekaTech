"""Check the [n] citation markers in a model answer against the snippets that were sent.

The prompt tells the model to cite snippets as [1], [2]... but a model can still cite a number
that was never provided. The frontend turns every [n] into a clickable citation, so an
out-of-range marker would point at nothing. Those markers are removed here and counted, so the
caller can report the removals instead of hiding them (an evaluation that scored only the
cleaned text would see a 100% valid-citation rate by construction).

Only the exact form [n] is touched: it is the one form the frontend renders as a citation.
"""

import re

# Spaces and tabs before a marker are matched with it, so "cores [9]." becomes "cores."
# Line breaks are never matched, so bullet lists survive.
_MARKER = re.compile(r"[ \t]*\[(\d+)\]")


def strip_invalid_citations(answer: str, snippet_count: int) -> tuple[str, int]:
    """Remove [n] markers outside 1..snippet_count. Returns (cleaned_answer, number_removed)."""
    removed = 0

    def replace(match: re.Match) -> str:
        nonlocal removed
        if 1 <= int(match.group(1)) <= snippet_count:
            return match.group(0)
        removed += 1
        return ""

    return _MARKER.sub(replace, answer), removed
