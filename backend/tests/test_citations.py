import pytest

from citations import strip_invalid_citations


def test_valid_markers_are_left_alone():
    answer = "It has **6 cores** [1] and 12 threads [2][3]."
    assert strip_invalid_citations(answer, 3) == (answer, 0)


def test_out_of_range_marker_is_removed_with_its_leading_space():
    assert strip_invalid_citations("It has 6 cores [9].", 3) == ("It has 6 cores.", 1)


def test_marker_zero_is_invalid():
    assert strip_invalid_citations("Battery is 4000mAh [0].", 3) == ("Battery is 4000mAh.", 1)


def test_only_the_bad_marker_of_an_adjacent_pair_is_removed():
    assert strip_invalid_citations("Fast charging [1][7].", 3) == ("Fast charging [1].", 1)


def test_every_bad_marker_is_counted():
    cleaned, removed = strip_invalid_citations("A [5] and B [6] but C [2].", 3)
    assert (cleaned, removed) == ("A and B but C [2].", 2)


def test_line_breaks_and_bullets_survive():
    answer = "Comparison:\n- Camera: **48MP** [1]\n- Battery: **4000mAh** [8]\n- Display: **6.1-inch** [2]"
    cleaned, removed = strip_invalid_citations(answer, 3)
    assert cleaned == "Comparison:\n- Camera: **48MP** [1]\n- Battery: **4000mAh**\n- Display: **6.1-inch** [2]"
    assert removed == 1


def test_marker_at_the_start_of_a_line_does_not_join_lines():
    cleaned, removed = strip_invalid_citations("First line.\n[9] Second line.", 3)
    assert cleaned == "First line.\n Second line."
    assert removed == 1


def test_no_snippets_means_every_marker_is_invalid():
    assert strip_invalid_citations("Anything [1] at all [2].", 0) == ("Anything at all.", 2)


@pytest.mark.parametrize("answer", ["Cores [1,9] here.", "Cores (9) here.", "Cores [a] here.", "Cores [] here."])
def test_other_forms_are_not_touched(answer):
    # The prompt forbids these, and the frontend does not render them as citations.
    assert strip_invalid_citations(answer, 3) == (answer, 0)


def test_answer_without_markers_is_unchanged():
    assert strip_invalid_citations("The sources don't say.", 3) == ("The sources don't say.", 0)


# "(n)" safety net (15 Nov 2026): the X200 Pro answer on production cited "(1)" throughout.
from citations import normalize_paren_citations


def test_paren_only_answer_becomes_bracket_citations():
    answer = "It has a 6000 mAh battery (1). It supports 90W charging (2)."
    assert normalize_paren_citations(answer, 2) == ("It has a 6000 mAh battery [1]. It supports 90W charging [2].", 2)


def test_paren_markers_left_alone_when_the_answer_already_uses_brackets():
    answer = "Chip: Dimensity 9400 [1]. SIM slots (2) are listed."
    assert normalize_paren_citations(answer, 3) == (answer, 0)


def test_paren_number_outside_the_snippets_is_left_alone():
    answer = "It has a 6000 mAh battery (1) and (7) colours."
    assert normalize_paren_citations(answer, 2) == ("It has a 6000 mAh battery [1] and (7) colours.", 1)


def test_parens_inside_words_or_values_are_not_touched():
    answer = "Clock 1 x 3.6GHz(1) and model CPH(2)."
    assert normalize_paren_citations(answer, 3) == (answer, 0)


def test_no_snippets_means_no_rewrite():
    assert normalize_paren_citations("General answer (1).", 0) == ("General answer (1).", 0)


# --- Stand-in values for a variant not on file (eval TC-24, 24 Nov 2026) -------------------------
from citations import drop_stand_in_values

S24_PLUS_REAL_ANSWERS = [
    # Seen in the 23-24 Nov eval runs (v2-v5): each gave the base S24's 4000mAh after declining.
    "The saved specs do not include the Samsung Galaxy S24+, so its battery capacity is not provided "
    "in these specs. The Galaxy S24 (a different model) is listed with a **4000mAh** battery [9].",
    "The provided snippets do not include the Samsung Galaxy S24+ model, so its battery capacity is not "
    "listed. The Galaxy S24 (a different model) is shown with a **4000mAh** battery [9].",
    "The saved specs include the Samsung Galaxy S24, which lists a battery capacity of **4000mAh** [9]. "
    "The Samsung Galaxy S24+ is not present in the saved specs, so its battery capacity is not provided here.",
    "The provided snippets do not state the battery capacity for the Samsung Galaxy S24+.\n\n"
    "The Galaxy S24 (not the S24+) is listed with a **4000mAh** battery [9].",
    "The snippets do not specify the Samsung Galaxy S24+ battery capacity. The Galaxy S24 (not S24+) is "
    "listed with a **4000mAh** battery [9].",
]


@pytest.mark.parametrize("answer", S24_PLUS_REAL_ANSWERS)
def test_stand_in_value_for_a_variant_not_on_file_is_removed(answer):
    cleaned, removed = drop_stand_in_values(answer, ["Galaxy S24"])
    assert removed == 1
    assert "4000" not in cleaned
    assert "S24+" in cleaned


def test_lowercase_brand_variant_is_recognised():
    cleaned, removed = drop_stand_in_values(
        "The saved specs do not include the iPhone 15 Plus or its display size. "
        "The provided iPhone 15 display is **6.1 inches** (diagonal) [1].", ["iPhone 15"]
    )
    assert (cleaned, removed) == ("The saved specs do not include the iPhone 15 Plus or its display size.", 1)


@pytest.mark.parametrize("answer, scoped", [
    # A missing spec, not a missing model.
    ("The saved specs do not include the 14 Pro+ 5G charging speed; the 14 Pro 5G has 5000 mAh [1].", None),
    # The variant is one of the asked gadgets, so it is on file.
    ("The saved specs do not include the Galaxy S24+. The Galaxy S24 has 4000mAh [1].", ["Galaxy S24+"]),
    ("- 14 Pro+ 5G: 5000 mAh [1].\n- The saved specs do not list the 14 Pro+ battery here. The 14 Pro 5G has "
     "4600 mAh [2].", ["14 Pro+ 5G", "14 Pro 5G"]),
    # No decline at all.
    ("It has a **4000mAh** battery [1].", ["Galaxy S24"]),
    # A decline that names no other model's value.
    ("The saved specs do not include the Galaxy S24+. Its battery is not stated.", ["Galaxy S24"]),
])
def test_answers_without_a_stand_in_are_untouched(answer, scoped):
    assert drop_stand_in_values(answer, scoped) == (answer, 0)
