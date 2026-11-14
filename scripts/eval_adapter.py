"""Collect real answers from a running TekaTech API in the shape scripts/eval_runner.py scores.

The evaluator numbers the verified source pack [1]-[10] (prompts/eval/sources.json), but the app
numbers the snippets it retrieves for each question [1]-[N] in retrieval order. This script asks
each evaluation question through POST /query, maps every retrieved chunk back to the pack
snippet(s) whose text it holds, and rewrites the [n] markers in the answer to pack ids, so the
runner can score them. A chunk that holds no pack snippet is rewritten to [0], which the runner
reports as a citation outside the pack.

Standard library only, like scripts/ai_smoke.py. It spends real OpenAI credit (about half a cent
per question), so it plans by default and only asks the questions with --yes. It refuses a
non-local API unless --allow-remote, because every call comes out of the shared prepaid balance.

    python scripts/eval_adapter.py --api-base http://127.0.0.1:8000            # plan only
    python scripts/eval_adapter.py --api-base http://127.0.0.1:8000 --yes --out .local/answers.json
    python scripts/eval_runner.py --answers .local/answers.json --markdown .local/report.md

Prerequisite: each pack snippet saved and indexed as its OWN spec chunk in the target database
(one POST /gadgets/{id}/specs per snippet), otherwise a chunk holding several snippets would
credit a citation to all of them. The pre-check enforces this.

General-knowledge mode (#172): --mode gk uses prompts/eval/gk_cases.json, sends
"allow_general_knowledge": true and each case's "plain_language", records "answer_basis" per case
next to "invalid_citations_removed", and does not rewrite citations (GK replies have no sources) or
check the pack. Score it with `python scripts/eval_runner.py --mode gk --answers ...`. GK is used
only when retrieval finds no specs, so run it against a database WITHOUT the iPhone 15 / Galaxy S24
specs: a gadget that has them is answered grounded, and the scorer then fails that case on
answer_basis instead of crediting it.

Scoped questions (#66): a question that carries "gadget_ids" (the gadget page, the compare page)
takes a different retrieval path from an unscoped one (nearest chunks whatever their score, instead
of the 0.5 threshold). `--scope prompts/eval/scope.json` makes the run follow that path: the file
names each case's gadgets, they are looked up by name in GET /gadgets, and the ids are sent as
"gadget_ids". Cases the file does not list stay unscoped. A name that matches no gadget, or more than
one, stops the run before any question is asked.

Sign-in (14 Nov 2026): POST /query needs a signed-in user, and a non-admin may ask only 20 AI
questions per day. Set TEKATECH_ACCESS_TOKEN to an ADMIN account's access token (admins are exempt
from the daily limit); it is read from the environment only, sent as a Bearer header and never
printed. Without it every question is recorded as an HTTP 401 error.

The output also carries "invalid_citations_removed" per case: the backend strips citation markers
that point outside the retrieved snippets, so an evaluator must count those removals itself or
the valid-citation rate would be 100% by construction.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "prompts" / "eval"
MARKER = re.compile(r"\[(\d+)\]")
UNMAPPED = 0  # not a pack id, so the runner reports it as a citation outside the pack
QUERY_DELAY_SECONDS = 6.5  # /query allows 10 per minute per client
TIMEOUT_SECONDS = 90  # a cold start on the free host can take ~45 s
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
TOKEN_ENV = "TEKATECH_ACCESS_TOKEN"


class ApiError(Exception):
    def __init__(self, status, detail):
        super().__init__(f"HTTP {status}: {detail}")
        self.status, self.detail = status, detail


def http_json(method, url, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    token = os.environ.get(TOKEN_ENV, "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=data, method=method, headers=headers)
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("detail")
        except (ValueError, AttributeError):
            detail = None
        raise ApiError(exc.code, detail or exc.reason) from None
    except URLError as exc:
        raise ApiError(0, str(exc.reason)) from None


def norm(text):
    return " ".join(text.lower().split())


def pack_ids_in(chunk_text, snippets):
    """Pack snippet ids whose text this chunk contains."""
    chunk = norm(chunk_text)
    return [s["id"] for s in snippets if norm(s["text"]) in chunk]


def check_pack(chunks, snippets):
    """Return (missing_ids, merged) for the chunks stored in the target database.

    missing: pack snippets that no stored chunk contains. merged: chunks holding more than one
    pack snippet, which would credit one citation to several snippets.
    """
    held = [pack_ids_in(chunk, snippets) for chunk in chunks]
    seen = {i for ids in held for i in ids}
    missing = [s["id"] for s in snippets if s["id"] not in seen]
    merged = [ids for ids in held if len(ids) > 1]
    return missing, merged


def rewrite_citations(answer, source_contents, snippets):
    """Replace each [k] (k = retrieval position, 1-based) with the pack ids of that chunk."""
    mapping = [pack_ids_in(content, snippets) for content in source_contents]

    def replace(match):
        k = int(match.group(1))
        if not 1 <= k <= len(mapping):
            return match.group(0)
        return "".join(f"[{i}]" for i in mapping[k - 1]) or f"[{UNMAPPED}]"

    return MARKER.sub(replace, answer)


class ScopeError(Exception):
    pass


def load_scope(path):
    """Read a scope file: {"gadgets": {key: gadget name}, "cases": {case id: [key, ...]}}."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    names, cases = data.get("gadgets"), data.get("cases")
    if not isinstance(names, dict) or not isinstance(cases, dict):
        raise ScopeError('Scope file needs a "gadgets" object (key -> name) and a "cases" object (case id -> [keys]).')
    for case_id, keys in cases.items():
        if not isinstance(keys, list) or not keys or any(key not in names for key in keys):
            raise ScopeError(f"Scope for {case_id} must be a non-empty list of keys from \"gadgets\".")
    return names, cases


def resolve_scope(names, cases, gadgets, wanted_ids):
    """Map each wanted case id to the ids of its gadgets, matching names case-insensitively.

    Raises ScopeError if a name matches no gadget or more than one: a wrong scope would quietly
    change which chunks are retrieved, so it must never be guessed."""
    by_name = {}
    for gadget in gadgets:
        by_name.setdefault(str(gadget.get("name", "")).strip().lower(), []).append(gadget["id"])
    resolved, problems = {}, []
    for case_id in wanted_ids:
        keys = cases.get(case_id)
        if not keys:
            continue
        ids = []
        for key in keys:
            found = by_name.get(names[key].strip().lower(), [])
            if len(found) != 1:
                problems.append(f'"{names[key]}" ({"no match" if not found else f"{len(found)} matches"})')
            else:
                ids.append(found[0])
        resolved[case_id] = ids
    if problems:
        raise ScopeError("Scope names not resolved in this API: " + ", ".join(sorted(set(problems))) +
                         ". Edit the names in the scope file to match the catalog.")
    return resolved


def stored_chunks(api_base, http=http_json):
    chunks = []
    for gadget in http("GET", f"{api_base}/gadgets"):
        for spec in http("GET", f"{api_base}/gadgets/{gadget['id']}/specs"):
            if spec.get("indexing_status") == "indexed":
                chunks.append(spec["content"])
    return chunks


def default_prompt_version(name="PROMPT_VERSION"):
    try:
        text = (ROOT / "backend" / "prompts.py").read_text(encoding="utf-8")
        return re.search(rf'^{name}\s*=\s*"([^"]+)"', text, re.MULTILINE).group(1)
    except (OSError, AttributeError):
        return "unknown"


def collect(api_base, cases, snippets, http=http_json, sleep=time.sleep, delay=QUERY_DELAY_SECONDS,
            gk=False, basis=None, scope=None):
    """Ask every case. In gk mode the request opts in to general knowledge, citations are left
    alone and each reply's answer_basis is stored in `basis` (a dict the caller passes in).
    `scope` maps case id -> gadget ids; those cases are sent with "gadget_ids"."""
    answers, removed, errors, models = {}, {}, {}, set()
    for index, case in enumerate(cases):
        if index:
            sleep(delay)
        payload = {"question": case["query"]}
        if gk:
            payload["allow_general_knowledge"] = True
            payload["plain_language"] = bool(case.get("plain_language"))
        if scope and scope.get(case["id"]):
            payload["gadget_ids"] = list(scope[case["id"]])
        try:
            try:
                reply = http("POST", f"{api_base}/query", payload)
            except ApiError as exc:
                if exc.status != 429:
                    raise
                sleep(60)  # one retry after the per-minute window
                reply = http("POST", f"{api_base}/query", payload)
        except ApiError as exc:
            errors[case["id"]] = str(exc)
            continue
        if gk:
            answers[case["id"]] = reply["answer"]
            if basis is not None:
                basis[case["id"]] = reply.get("answer_basis", "none")
        else:
            contents = [s["content"] for s in reply.get("sources", [])]
            answers[case["id"]] = rewrite_citations(reply["answer"], contents, snippets)
        removed[case["id"]] = reply.get("invalid_citations_removed", 0)
        models.add(reply.get("model_used"))
    return answers, removed, errors, models


def is_local(api_base):
    return urlparse(api_base).hostname in LOCAL_HOSTS


def main(argv=None, http=http_json, sleep=time.sleep):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-base", required=True, help="e.g. http://127.0.0.1:8000")
    parser.add_argument("--mode", choices=("grounded", "gk"), default="grounded",
                        help="grounded (default, cited answers) or gk (optional general-knowledge answers, #172)")
    parser.add_argument("--cases", type=Path, help="Cases file (default: cases.json, or gk_cases.json with --mode gk)")
    parser.add_argument("--scope", type=Path, help="Scope file: send each listed case with gadget_ids (see the docstring)")
    parser.add_argument("--sources", type=Path, default=EVAL_DIR / "sources.json")
    parser.add_argument("--out", type=Path, default=Path(".local/answers.json"))
    parser.add_argument("--prompt-version", help="Default: PROMPT_VERSION, or GK_PROMPT_VERSION with --mode gk")
    parser.add_argument("--model", help="Overrides the model name reported by the API")
    parser.add_argument("--limit", type=int, help="Ask only the first N cases")
    parser.add_argument("--yes", action="store_true", help="Actually ask the questions (spends credit)")
    parser.add_argument("--allow-remote", action="store_true", help="Allow a non-local --api-base")
    parser.add_argument("--allow-merged-chunks", action="store_true", help="Proceed although a chunk holds several pack snippets")
    args = parser.parse_args(argv)

    api_base = args.api_base.rstrip("/")
    if not is_local(api_base) and not args.allow_remote:
        print(f"Refusing {api_base}: not a local API. Every question spends the shared OpenAI budget; "
              "pass --allow-remote if you mean it.", file=sys.stderr)
        return 2

    gk = args.mode == "gk"
    if args.cases is None:
        args.cases = EVAL_DIR / ("gk_cases.json" if gk else "cases.json")
    if args.prompt_version is None:
        args.prompt_version = default_prompt_version("GK_PROMPT_VERSION" if gk else "PROMPT_VERSION")
    cases = json.loads(args.cases.read_text(encoding="utf-8"))["cases"]
    snippets = [] if gk else json.loads(args.sources.read_text(encoding="utf-8"))["snippets"]
    if args.limit:
        cases = cases[: args.limit]

    scope, scope_error = {}, None
    if args.scope:
        try:
            names, scope_cases = load_scope(args.scope)
            scope = resolve_scope(names, scope_cases, http("GET", f"{api_base}/gadgets"), [c["id"] for c in cases])
        except (ScopeError, OSError, ValueError, KeyError) as exc:
            scope_error = exc
    if scope_error:
        print(f"Cannot use --scope: {scope_error}", file=sys.stderr)
        return 2

    missing, merged = [], []
    if not gk:  # GK sends no snippets, so there is no pack to check
        try:
            missing, merged = check_pack(stored_chunks(api_base, http), snippets)
        except ApiError as exc:
            print(f"Could not read the API's specs ({exc}). Is it running?", file=sys.stderr)
            return 2
    if missing:
        print(f"Pack snippets not stored and indexed in {api_base}: {missing}. Add each as its own spec chunk first.",
              file=sys.stderr)
        return 2
    if merged and not args.allow_merged_chunks:
        print(f"{len(merged)} stored chunk(s) hold several pack snippets, so one citation would credit all of them "
              "(for example snippets " + ", ".join(str(ids) for ids in merged[:3]) + "). Re-add each snippet as its "
              "own chunk, or pass --allow-merged-chunks to accept coarse citation credit.", file=sys.stderr)
        return 2

    print(("General-knowledge mode: no pack check. " if gk else "Pack check passed. ") + f"{len(cases)} question(s) would be asked of {api_base} "
          f"(~${len(cases) * 0.005:.2f}, about {len(cases) * QUERY_DELAY_SECONDS / 60:.1f} min)."
          + (f" {len(scope)} of them are scoped to their gadgets." if args.scope else ""))
    if not args.yes:
        print("Plan only. Re-run with --yes to ask them.")
        return 0
    if not os.environ.get(TOKEN_ENV, "").strip():
        print(f"Warning: {TOKEN_ENV} is not set; POST /query needs a signed-in (admin) user, so each "
              "question will fail with HTTP 401.", file=sys.stderr)

    basis = {}
    answers, removed, errors, models = collect(api_base, cases, snippets, http, sleep, gk=gk, basis=basis, scope=scope)
    model = args.model or ", ".join(sorted(m for m in models if m)) or "unknown"
    report = {
        "provider": f"TekaTech POST /query ({api_base})",
        "model": model,
        "prompt_version": args.prompt_version,
        "origin": "live",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "note": "Real /query output. Citation markers were rewritten from retrieval position to pack ids. "
                "invalid_citations_removed counts markers the backend stripped; score them as invalid.",
        "invalid_citations_removed": removed,
        "errors": errors,
        "answers": answers,
    }
    if scope:
        report["scoped_cases"] = sorted(scope)
        report["note"] += " Scoped cases were sent with gadget_ids (nearest chunks of those gadgets, any score)."
    if gk:
        report["answer_basis"] = basis
        report["note"] = ("Real /query output with allow_general_knowledge on; citations not rewritten. "
                          "answer_basis is each reply's basis: anything but general_knowledge fails the case.")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(answers)} answer(s) to {args.out}; {len(errors)} failed; "
          f"{sum(removed.values())} citation marker(s) removed by the backend.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
