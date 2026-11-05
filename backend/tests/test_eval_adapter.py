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
        if url.endswith("/query"):
            self.bodies = getattr(self, "bodies", []) + [body]
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


# --- --mode gk (#172) ---

GK_CASES = [
    {"id": "G-1", "query": "What is a good battery life for a phone?"},
    {"id": "G-2", "query": "Explain OLED simply.", "plain_language": True},
]


def gk_reply(answer, basis="general_knowledge", removed=0):
    return {"answer": answer, "sources": [], "model_used": "openai:gpt-5-mini",
            "invalid_citations_removed": removed, "answer_basis": basis}


def run_gk_cli(tmp_path, api, *extra):
    cases = tmp_path / "gk_cases.json"
    cases.write_text(json.dumps({"cases": GK_CASES}), encoding="utf-8")
    out = tmp_path / "gk_answers.json"
    code = adapter.main(["--api-base", "http://127.0.0.1:8000", "--mode", "gk", "--cases", str(cases),
                         "--out", str(out), *extra], http=api, sleep=lambda _s: None)
    return code, out


def test_gk_mode_opts_in_sends_plain_language_and_records_the_basis(tmp_path):
    api = FakeApi([], [gk_reply("From general knowledge: about a day."),
                       gk_reply("From general knowledge: a screen type.", basis="none", removed=1)])
    code, out = run_gk_cli(tmp_path, api, "--yes")
    saved = json.loads(out.read_text(encoding="utf-8"))
    assert code == 0
    assert api.bodies == [
        {"question": GK_CASES[0]["query"], "allow_general_knowledge": True, "plain_language": False},
        {"question": GK_CASES[1]["query"], "allow_general_knowledge": True, "plain_language": True},
    ]
    assert saved["answers"]["G-1"] == "From general knowledge: about a day."  # text untouched
    assert saved["answer_basis"] == {"G-1": "general_knowledge", "G-2": "none"}
    assert saved["invalid_citations_removed"] == {"G-1": 0, "G-2": 1}


def test_gk_mode_needs_no_pack_and_reads_no_specs(tmp_path, capsys):
    api = FakeApi([], [])  # an empty catalogue would stop grounded mode
    code, _ = run_gk_cli(tmp_path, api)
    assert code == 0 and api.calls == []
    assert "no pack check" in capsys.readouterr().out


def test_gk_mode_defaults_to_the_gk_prompt_version_and_cases(tmp_path):
    api = FakeApi([], [gk_reply("a"), gk_reply("b")])
    _, out = run_gk_cli(tmp_path, api, "--yes")
    assert json.loads(out.read_text(encoding="utf-8"))["prompt_version"] == adapter.default_prompt_version("GK_PROMPT_VERSION")
    assert adapter.default_prompt_version("GK_PROMPT_VERSION") != adapter.default_prompt_version()


def test_grounded_requests_do_not_opt_in_to_general_knowledge(tmp_path):
    api = FakeApi(ONE_PER_CHUNK, [reply("Ok [1].", ["A16 Bionic chip."]), reply("Ok [2].", ["A16 Bionic chip."])])
    run_cli(tmp_path, api, "--yes")
    assert all(set(b) == {"question"} for b in api.bodies)
    assert "answer_basis" not in json.loads((tmp_path / "answers.json").read_text(encoding="utf-8"))


def test_gk_output_feeds_the_scorer_and_a_grounded_reply_fails_on_basis(tmp_path):
    spec = importlib.util.spec_from_file_location("eval_runner", Path(__file__).resolve().parents[2] / "scripts/eval_runner.py")
    runner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runner)
    root = Path(__file__).resolve().parents[2] / "prompts/eval"
    cases = json.loads((root / "gk_cases.json").read_text(encoding="utf-8"))
    ref = json.loads((root / "gk_reference_answers.json").read_text(encoding="utf-8"))["answers"]
    ids = [c["id"] for c in cases["cases"]]
    replies = [gk_reply(ref[i]) for i in ids]
    replies[0] = gk_reply(ref[ids[0]], basis="specs")  # the database held specs: grounded, not GK
    case_file = tmp_path / "all_gk.json"
    case_file.write_text(json.dumps(cases), encoding="utf-8")
    out = tmp_path / "out.json"
    adapter.main(["--api-base", "http://127.0.0.1:8000", "--mode", "gk", "--cases", str(case_file), "--out", str(out), "--yes"],
                 http=FakeApi([], replies), sleep=lambda _s: None)
    saved = json.loads(out.read_text(encoding="utf-8"))
    report = runner.evaluate_gk(cases, saved["answers"], saved["invalid_citations_removed"], saved["answer_basis"])
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 5, "total": 6, "rate": 0.833}
    assert not report["targets_met"]


# --- --scope: per-case gadget_ids (#66) ---

class NamedGadgetsApi(FakeApi):
    """FakeApi whose catalogue lists named gadgets, so --scope can look them up."""

    def __init__(self, replies, gadgets):
        super().__init__(ONE_PER_CHUNK, replies)
        self.gadgets = gadgets

    def __call__(self, method, url, body=None):
        if method == "GET" and url.endswith("/gadgets"):
            self.calls.append((method, url))
            return self.gadgets
        if method == "GET" and "/gadgets/" in url and url.endswith("/specs"):
            self.calls.append((method, url))
            return [{"content": text, "indexing_status": "indexed"} for text in self.chunks] if "/p1/" in url else []
        return super().__call__(method, url, body)


CATALOG = [{"id": "p1", "name": "iPhone 15"}, {"id": "s1", "name": "Galaxy S24"}]


def write_scope(tmp_path, cases):
    path = tmp_path / "scope.json"
    path.write_text(json.dumps({"gadgets": {"iphone": "iphone 15", "s24": "Galaxy S24"}, "cases": cases}),
                    encoding="utf-8")
    return path


def test_scoped_cases_send_gadget_ids_and_others_stay_unscoped(tmp_path):
    api = NamedGadgetsApi([reply("a [1]", ["A16 Bionic chip."]), reply("b [1]", ["A16 Bionic chip."])], CATALOG)
    scope = write_scope(tmp_path, {"T-1": ["iphone", "s24"]})
    code, out, _ = run_cli(tmp_path, api, "--yes", "--scope", str(scope))
    saved = json.loads(out.read_text(encoding="utf-8"))
    assert code == 0
    assert api.bodies[0] == {"question": CASES[0]["query"], "gadget_ids": ["p1", "s1"]}  # names matched ignoring case
    assert api.bodies[1] == {"question": CASES[1]["query"]}  # not listed: unchanged request
    assert saved["scoped_cases"] == ["T-1"]


def test_without_scope_requests_are_unchanged(tmp_path):
    api = NamedGadgetsApi([reply("a [1]", ["A16 Bionic chip."]), reply("b [1]", ["A16 Bionic chip."])], CATALOG)
    code, out, _ = run_cli(tmp_path, api, "--yes")
    assert code == 0
    assert all("gadget_ids" not in body for body in api.bodies)
    assert "scoped_cases" not in json.loads(out.read_text(encoding="utf-8"))


def test_unknown_gadget_name_stops_the_run_before_any_question(tmp_path, capsys):
    api = NamedGadgetsApi([], [{"id": "p1", "name": "iPhone 15"}])  # no Galaxy S24 in this catalogue
    scope = write_scope(tmp_path, {"T-1": ["iphone", "s24"]})
    code, _, _ = run_cli(tmp_path, api, "--yes", "--scope", str(scope))
    assert code == 2
    assert "Galaxy S24" in capsys.readouterr().err
    assert api.query_calls() == []


def test_ambiguous_gadget_name_is_refused_not_guessed(tmp_path, capsys):
    api = NamedGadgetsApi([], [{"id": "p1", "name": "iPhone 15"}, {"id": "p2", "name": "iphone 15"}])
    scope = write_scope(tmp_path, {"T-1": ["iphone"]})
    code, _, _ = run_cli(tmp_path, api, "--yes", "--scope", str(scope))
    assert code == 2
    assert "2 matches" in capsys.readouterr().err
    assert api.query_calls() == []


def test_a_scope_naming_a_key_that_does_not_exist_is_refused(tmp_path, capsys):
    api = NamedGadgetsApi([], CATALOG)
    scope = write_scope(tmp_path, {"T-1": ["nokia"]})
    code, _, _ = run_cli(tmp_path, api, "--yes", "--scope", str(scope))
    assert code == 2 and "non-empty list of keys" in capsys.readouterr().err


def test_a_case_missing_from_the_run_does_not_need_its_gadgets(tmp_path):
    # --limit 1 asks only T-1, so a scope entry for T-2 naming an absent gadget must not block the run.
    api = NamedGadgetsApi([reply("a [1]", ["A16 Bionic chip."])], [{"id": "p1", "name": "iPhone 15"}])
    scope = write_scope(tmp_path, {"T-1": ["iphone"], "T-2": ["s24"]})
    code, _, _ = run_cli(tmp_path, api, "--yes", "--limit", "1", "--scope", str(scope))
    assert code == 0
    assert api.bodies == [{"question": CASES[0]["query"], "gadget_ids": ["p1"]}]


def test_shipped_scope_file_covers_only_known_cases_and_known_keys():
    names, cases = adapter.load_scope(adapter.EVAL_DIR / "scope.json")
    known = {c["id"] for c in json.loads((adapter.EVAL_DIR / "cases.json").read_text(encoding="utf-8"))["cases"]}
    assert set(cases) <= known and cases
    assert set(names) == {"iphone-15", "galaxy-s24-ph"}
