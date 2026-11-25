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


# "(1)" right after a space, ending at a space, punctuation or the end of the text.
_PAREN_MARKER = re.compile(r"(?<=[ \t])\((\d+)\)(?=[\s.,;:!?]|$)")


def normalize_paren_citations(answer: str, snippet_count: int) -> tuple[str, int]:
    """Turn "(n)" into "[n]" when the model cited that way and nothing else.

    The prompt forbids "(1)", but a model occasionally uses it for a whole answer (seen on
    production, 15 Nov 2026, vivo X200 Pro). AnswerText.jsx only renders [n], so those citations
    showed as plain text. The rewrite is deliberately narrow: only when the answer has no [n]
    marker at all, and only for numbers 1..snippet_count, so a "(2)" inside a normal [n]-cited
    answer, or one that is not a snippet number, is left alone. Returns (answer, number_rewritten).
    """
    if snippet_count < 1 or _MARKER.search(answer):
        return answer, 0
    rewritten = 0

    def replace(match: re.Match) -> str:
        nonlocal rewritten
        if 1 <= int(match.group(1)) <= snippet_count:
            rewritten += 1
            return f"[{match.group(1)}]"
        return match.group(0)

    return _PAREN_MARKER.sub(replace, answer), rewritten


# --- Stand-in values for a variant that is not in the specs (24 Nov 2026) -----------------------
# Eval TC-24 failed in 7 of 8 runs on 24 Nov with prompts v3-v5: asked about the Galaxy S24+ with
# only the S24 on file, the answer declined ("the saved specs do not include the Galaxy S24+") and
# then gave the S24's 4000mAh anyway, sometimes "for reference". Prompt wording did not stop it at
# the fast settings (docs/devops/app-performance.md), so the answer is checked here instead.

# A model name ending in a variant suffix: "Galaxy S24+", "iPhone 15 Plus", "Pixel 9 Pro".
_VARIANT_NAME = (
    r"(?:[A-Za-z][\w-]*\s+){0,3}?[\w-]*\d+[\w-]*"
    r"(?:\s*\+|\s+(?:Plus|Pro\+?|Ultra|Max|FE|Lite|Mini)\b)"
)
# The answer says that model is absent ("do not include the Galaxy S24+", "the S24+ is not
# present"). The name must end the clause, so "do not include the 14 Pro+ 5G's charging speed"
# (a missing spec, not a missing model) never matches.
_ABSENT_VARIANT = re.compile(
    rf"(?:\b(?:do|does)\s+not|\bdon't|\bdoesn't)\s+(?:include|cover|contain|list|have)\s+(?:the\s+)?"
    rf"(?P<a>{_VARIANT_NAME})(?=\s+(?:model|variant)\b|\s*[.,;:()]|\s+or\b|\s*$)"
    rf"|(?P<b>{_VARIANT_NAME})(?:\s+(?:model|variant))?\s+(?:is|are)\s+not\s+(?:present|included|listed|in)\b"
    # "do not state the battery capacity for the Galaxy S24+" / "do not specify the Galaxy S24+ battery"
    rf"|(?:\b(?:do|does)\s+not|\bdon't|\bdoesn't)\s+(?:state|specify|list|give|mention|provide)\s+(?:the\s+)?"
    rf"(?:(?:[\w-]+\s+){{0,4}}?(?:for|of)\s+(?:the\s+)?(?P<c>{_VARIANT_NAME})(?=\s*[.,;:()]|\s+or\b|\s*$)"
    rf"|(?P<d>{_VARIANT_NAME})(?:'s)?\s+[a-z])"
)
_VARIANT_SUFFIX = re.compile(r"\s*\+$|\s+(?:Plus|Pro\+?|Ultra|Max|FE|Lite|Mini)$")
_SPEC_VALUE = re.compile(
    r"\d[\d,.]*\s*-?\s*(?:hz|mah|gb|tb|mb|nits|mp|hours?|hrs?|inch(?:es)?|in\b|mm|fps|ppi|w\b|g\b)",
    re.IGNORECASE,
)
def _squash(name: str) -> str:
    return re.sub(r"\s+", "", name).lower()


def _absent_name(match: re.Match) -> str:
    return next(g for g in match.group("a", "b", "c", "d") if g).strip()


def drop_stand_in_values(answer: str, scoped_names: list[str] | None = None) -> tuple[str, int]:
    """Remove sentences that give the base model's spec values after the answer says the asked
    variant is not in the specs. Returns (answer, sentences_removed); untouched otherwise.

    `scoped_names` are the gadgets the question was asked about: a variant among them is on file
    (for example the catalog's "14 Pro+ 5G" in a comparison), so it never triggers the check."""
    absent = _ABSENT_VARIANT.search(answer.replace("’", "'"))
    if not absent:
        return answer, 0
    name = _absent_name(absent)
    if name.split()[0].lower() == "the":
        name = name.split(None, 1)[1]
    # On file when it is one of the asked gadgets: "Samsung Galaxy S24+" for "Galaxy S24+", or
    # "14 Pro+" for "14 Pro+ 5G". The base "Galaxy S24" on the S24+ question never matches.
    if any(_squash(name).endswith(_squash(n)) or _squash(name) in _squash(n) for n in scoped_names or [] if n):
        return answer, 0
    base = _VARIANT_SUFFIX.sub("", name).split()
    key = r"\s+".join(re.escape(w) for w in base[-2:])
    # The base model, not followed by its suffix ("Galaxy S24" but not "Galaxy S24+").
    base_model = re.compile(rf"\b{key}(?!\s*\+|[\w-]|\s+(?:Plus|Pro|Ultra|Max|FE|Lite|Mini)\b)", re.IGNORECASE)
    parts = re.split(r"((?<=[.!?])(?:[ \t]*\[\d+\])*[ \t]+|\n+)", answer)
    kept, removed = [], 0
    for i in range(0, len(parts), 2):
        sentence = parts[i]
        sep = parts[i + 1] if i + 1 < len(parts) else ""
        stand_in = (
            not _ABSENT_VARIANT.search(sentence.replace("’", "'"))
            and _SPEC_VALUE.search(sentence)
            and base_model.search(sentence)
        )
        if stand_in:
            removed += 1
            continue
        kept.append(sentence + sep)
    if not removed:
        return answer, 0
    return "".join(kept).strip(), removed
