import importlib.util
import json
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "eval_adapter", Path(__file__).resolve().parents[2] / "scripts/eval_adapter.py"
)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)

SNIPPETS = [
    {"id": 1, "gadget": "iphone-15", "text": "6.1-inch OLED display, 2000 nits peak."},
    {"id": 2, "gadget": "iphone-15", "text": "A16 Bionic chip."},
    {"id": 8, "gadget": "galaxy-s24-ph", "text": "10MP telephoto camera."},
]
CASES = [
    {"id": "T-1", "query": "Brightness of the iPhone 15?"},
    {"id": "T-2", "query": "Chip in the iPhone 15?"},
]


class FakeApi:
    """Stands in for http_json: a stored-spec catalogue plus scripted /query replies."""

    def __init__(self, chunks, replies):
        self.chunks = chunks
        self.replies = list(replies)
        self.calls = []

    def __call__(self, method, url, body=None):
        self.calls.append((method, url))
        if url.endswith("/gadgets"):
            return [{"id": "g1"}]
        if url.endswith("/gadgets/g1/specs"):
            return [{"content": text, "indexing_status": "indexed"} for text in self.chunks]
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    def query_calls(self):
        return [c for c in self.calls if c[1].endswith("/query")]


ONE_PER_CHUNK = [s["text"] for s in SNIPPETS]


def reply(answer, sources, removed=0, model="openai:gpt-5-mini"):
    return {"answer": answer, "sources": [{"content": s} for s in sources],
            "model_used": model, "invalid_citations_removed": removed}


# --- mapping retrieval positions to pack ids ---

def test_citation_is_rewritten_to_the_pack_id_of_that_chunk():
    contents = ["A16 Bionic chip.", "6.1-inch OLED display, 2000 nits peak."]
    assert adapter.rewrite_citations("Chip [1], screen [2].", contents, SNIPPETS) == "Chip [2], screen [1]."


def test_chunk_holding_several_snippets_credits_all_of_them():
    contents = ["A16 Bionic chip. 10MP telephoto camera."]
    assert adapter.rewrite_citations("Both [1].", contents, SNIPPETS) == "Both [2][8]."


def test_chunk_outside_the_pack_becomes_the_unmapped_marker():
    assert adapter.rewrite_citations("Odd [1].", ["Something else entirely."], SNIPPETS) == "Odd [0]."


def test_rewriting_is_a_single_pass_and_leaves_other_markers_alone():
    # [1] becomes [2]; the new [2] must not be rewritten again. [7] is outside the retrieved range.
    contents = ["A16 Bionic chip.", "10MP telephoto camera."]
    assert adapter.rewrite_citations("X [1] Y [2] Z [7]", contents, SNIPPETS) == "X [2] Y [8] Z [7]"


def test_matching_ignores_case_and_whitespace():
    assert adapter.pack_ids_in("  a16   BIONIC chip.\n", SNIPPETS) == [2]


# --- pre-check of the target database ---

def test_pack_check_passes_when_each_snippet_is_its_own_chunk():
    assert adapter.check_pack(ONE_PER_CHUNK, SNIPPETS) == ([], [])


def test_pack_check_reports_missing_snippets():
    missing, merged = adapter.check_pack(["A16 Bionic chip."], SNIPPETS)
    assert missing == [1, 8] and merged == []


def test_pack_check_reports_merged_chunks():
    missing, merged = adapter.check_pack(["A16 Bionic chip. 10MP telephoto camera.", SNIPPETS[0]["text"]], SNIPPETS)
    assert missing == [] and merged == [[2, 8]]


# --- the CLI ---

def run_cli(tmp_path, api, *extra, base="http://127.0.0.1:8000"):
    cases = tmp_path / "cases.json"
    sources = tmp_path / "sources.json"
    cases.write_text(json.dumps({"cases": CASES}), encoding="utf-8")
    sources.write_text(json.dumps({"snippets": SNIPPETS}), encoding="utf-8")
    out = tmp_path / "answers.json"
    sleeps = []
    code = adapter.main(["--api-base", base, "--cases", str(cases), "--sources", str(sources), "--out", str(out), *extra],
                        http=api, sleep=sleeps.append)
    return code, out, sleeps


def test_plan_only_by_default_asks_no_questions(tmp_path, capsys):
    api = FakeApi(ONE_PER_CHUNK, [])
    code, out, _ = run_cli(tmp_path, api)
    assert code == 0 and not out.exists()
    assert api.query_calls() == []
    assert "Plan only" in capsys.readouterr().out


def test_yes_asks_every_question_and_writes_the_answers_file(tmp_path):
    api = FakeApi(ONE_PER_CHUNK, [
        reply("It reaches 2000 nits [1].", ["6.1-inch OLED display, 2000 nits peak."]),
        reply("A16 [1][5].", ["A16 Bionic chip."], removed=1),
    ])
    code, out, sleeps = run_cli(tmp_path, api, "--yes", "--prompt-version", "v9")
    report = json.loads(out.read_text(encoding="utf-8"))
    assert code == 0
    assert report["answers"] == {"T-1": "It reaches 2000 nits [1].", "T-2": "A16 [2][5]."}
    assert report["invalid_citations_removed"] == {"T-1": 0, "T-2": 1}
    assert (report["origin"], report["model"], report["prompt_version"]) == ("live", "openai:gpt-5-mini", "v9")
    assert report["errors"] == {}
    assert sleeps == [adapter.QUERY_DELAY_SECONDS]  # paced to stay under the 10/minute limit


def test_failed_question_is_recorded_not_fatal(tmp_path):
    api = FakeApi(ONE_PER_CHUNK, [
        adapter.ApiError(503, "AI answers are temporarily unavailable. Spec browsing still works."),
        reply("A16 [1].", ["A16 Bionic chip."]),
    ])
    code, out, _ = run_cli(tmp_path, api, "--yes")
    report = json.loads(out.read_text(encoding="utf-8"))
    assert code == 1  # non-zero so a script notices
    assert "T-1" not in report["answers"] and "503" in report["errors"]["T-1"]
    assert report["answers"]["T-2"] == "A16 [2]."


def test_rate_limited_question_is_retried_once(tmp_path):
    api = FakeApi(ONE_PER_CHUNK, [adapter.ApiError(429, "rate"), reply("Ok [1].", ["A16 Bionic chip."]),
                                  reply("Ok [1].", ["A16 Bionic chip."])])
    code, out, sleeps = run_cli(tmp_path, api, "--yes")
    assert code == 0 and 60 in sleeps
    assert len(api.query_calls()) == 3


def test_remote_api_is_refused_without_allow_remote(tmp_path, capsys):
    api = FakeApi(ONE_PER_CHUNK, [])
    code, _, _ = run_cli(tmp_path, api, "--yes", base="https://tekatech-api.onrender.com")
    assert code == 2 and api.calls == []
    assert "allow-remote" in capsys.readouterr().err


def test_remote_api_is_allowed_with_the_flag(tmp_path):
    api = FakeApi(ONE_PER_CHUNK, [])
    code, _, _ = run_cli(tmp_path, api, "--allow-remote", base="https://tekatech-api.onrender.com")
    assert code == 0  # plan only, but the pre-check ran


def test_missing_pack_snippets_stop_the_run_before_any_question(tmp_path, capsys):
    api = FakeApi(["A16 Bionic chip."], [])
    code, _, _ = run_cli(tmp_path, api, "--yes")
    assert code == 2 and api.query_calls() == []
    assert "[1, 8]" in capsys.readouterr().err


def test_merged_chunks_stop_the_run_unless_accepted(tmp_path):
    chunks = ["A16 Bionic chip. 10MP telephoto camera.", SNIPPETS[0]["text"]]
    code, _, _ = run_cli(tmp_path, FakeApi(chunks, []), "--yes")
    assert code == 2
    code, _, _ = run_cli(tmp_path, FakeApi(chunks, []), "--allow-merged-chunks")
    assert code == 0


def test_limit_asks_only_the_first_cases(tmp_path):
    api = FakeApi(ONE_PER_CHUNK, [reply("Ok [1].", ["A16 Bionic chip."])])
    code, out, _ = run_cli(tmp_path, api, "--yes", "--limit", "1")
    assert code == 0 and list(json.loads(out.read_text(encoding="utf-8"))["answers"]) == ["T-1"]


def test_default_prompt_version_comes_from_the_backend_module():
    import re
    text = (Path(__file__).resolve().parents[1] / "prompts.py").read_text(encoding="utf-8")
    assert adapter.default_prompt_version() == re.search(r'PROMPT_VERSION = "([^"]+)"', text).group(1)
