import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "benchmark_answer_settings", Path(__file__).resolve().parents[2] / "scripts/benchmark_answer_settings.py"
)
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)

SOURCES = {
    "snippets": [
        {"id": 1, "gadget": "iphone-15", "text": "2000 nits peak."},
        {"id": 2, "gadget": "iphone-15", "text": "A16 Bionic chip."},
        {"id": 8, "gadget": "galaxy-s24-ph", "text": "10MP telephoto camera."},
    ]
}
SCOPE = {"gadgets": {"iphone-15": "iPhone 15", "galaxy-s24-ph": "Galaxy S24"}, "cases": {"T-1": ["galaxy-s24-ph"]}}


def test_scoped_case_gets_only_its_gadget_numbered_from_one_with_the_scope_note():
    content, pack_ids = bench.build_case_prompt({"id": "T-1", "query": "Zoom?"}, SOURCES, SCOPE)
    assert pack_ids == [8]
    assert content == (
        "Spec snippets:\n[1] (Galaxy S24) 10MP telephoto camera."
        "\n\nGadgets in this comparison: Galaxy S24.\n\nQuestion: Zoom?"
    )


def test_unscoped_case_gets_every_snippet_and_no_note():
    content, pack_ids = bench.build_case_prompt({"id": "T-9", "query": "Chip?"}, SOURCES, SCOPE)
    assert pack_ids == [1, 2, 8]
    assert "Gadgets in this comparison" not in content
    assert "[3] (Galaxy S24)" in content


def test_markers_map_back_to_pack_ids_and_out_of_range_becomes_zero():
    assert bench.to_pack_ids("Bright [1], chip [2], zoom [3], bogus [9].", [1, 2, 8]) == (
        "Bright [1], chip [2], zoom [8], bogus [0]."
    )


def test_plans_without_calling_openai(capsys):
    assert bench.main(["--configs", "low,minimal", "--limit", "2"]) == 0
    out = capsys.readouterr().out
    assert "2 cases x 2 settings" in out
    assert "Nothing sent" in out
