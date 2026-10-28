"""Builds the input for the keyword fallback that /query runs when vector search finds nothing.

routers/query.py calls the keyword_match_spec_documents RPC (sql/keyword_match_spec_documents.sql)
only after match_spec_documents returned no chunk above MATCH_THRESHOLD. The RPC takes:

  - search_query: content words from the question, joined with " or " for Postgres
    websearch_to_tsquery('english', ...). OR, not AND: a spec chunk such as "Exynos 2400
    processor." should match "What chip does it use?" through one synonym, not all words.
  - unit_patterns: fixed Postgres regular expressions for spec units (4000mAh, 48MP, 256GB,
    167 g, 25W). Full-text search keeps "4000mAh" as one token, so the word "mAh" alone would
    never match it. These patterns come only from SYNONYM_GROUPS below, never from user text.

The question is untrusted. Only \\w word characters reach search_query, and websearch_to_tsquery
never raises a syntax error, so no question can break or widen the SQL. The words "or", "and"
and "not" are dropped so a question cannot change the operators.
"""

import re
from dataclasses import dataclass, field

MAX_TERMS = 24  # the question is at most 150 characters; this bounds the expanded query too

# Filler that would match unrelated chunks or nothing at all. Postgres drops its own English
# stopwords as well; this list mainly removes question words Postgres keeps.
STOPWORDS = frozenset(
    """
    a about all also am an and any are as at be been best better between both but by can
    compare compared comparison could detail details did do does doing for from get give good
    had has have how i if in info information is it its key know like many me more most much
    my not of on or other please so spec specification specifications specs support supported
    supports tell than that the their them then there these they this those to up use used uses
    using versus vs was what when where which who why will with would you your
    """.split()
)

# Each group: trigger/expansion words, and an optional Postgres regex (ARE syntax; \y is a word
# boundary there) for the unit the spec text writes next to a number. If any word of a group is
# in the question, every word of the group is searched and its pattern is added.
SYNONYM_GROUPS: tuple[tuple[frozenset[str], str | None], ...] = (
    (frozenset({"chip", "chipset", "processor", "soc", "cpu"}), None),
    (frozenset({"battery", "mah"}), r"[0-9]\s*mah\y"),
    (frozenset({"screen", "display"}), None),
    (frozenset({"camera", "cameras", "megapixel", "megapixels", "mp"}), r"[0-9]\s*mp\y"),
    (frozenset({"storage", "gb", "tb"}), r"[0-9]\s*(gb|tb)\y"),
    # Two digits or more, so "5G" (the network) is not read as a weight.
    (frozenset({"weight", "weigh", "weighs", "heavy", "grams", "gram"}), r"[0-9]{2,}\s*(g|grams?)\y"),
    (frozenset({"charging", "charge", "charger", "watt", "watts"}), r"[0-9]\s*w\y"),
)

# "4000mah" or "25w" in the question: the unit suffix also triggers its group. A weight needs two
# digits or more ("167g"), so "5g" stays a network term.
_NUMBER_WITH_UNIT = re.compile(r"([0-9]+)([a-z]+)")
_UNIT_TRIGGERS = {"mah": "mah", "mp": "mp", "gb": "gb", "tb": "tb", "g": "grams", "w": "watt"}


@dataclass(frozen=True)
class KeywordQuery:
    search_query: str = ""
    unit_patterns: list[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return bool(self.search_query or self.unit_patterns)


def build_keyword_query(question: str) -> KeywordQuery:
    """Content words of the question plus synonym expansion; empty when nothing is searchable."""
    words = re.findall(r"\w+", question.lower())
    terms: list[str] = []
    triggers: set[str] = set()

    for word in words:
        if word in STOPWORDS or len(word) < 2 or word.isdigit():
            continue
        unit = _NUMBER_WITH_UNIT.fullmatch(word)
        if unit and unit.group(2) in _UNIT_TRIGGERS and not (unit.group(2) == "g" and len(unit.group(1)) < 2):
            triggers.add(_UNIT_TRIGGERS[unit.group(2)])
        triggers.add(word)
        if word not in terms:
            terms.append(word)

    patterns: list[str] = []
    for group, pattern in SYNONYM_GROUPS:
        if group & triggers:
            for synonym in sorted(group):
                if synonym not in terms:
                    terms.append(synonym)
            if pattern:
                patterns.append(pattern)

    return KeywordQuery(" or ".join(terms[:MAX_TERMS]), patterns)
