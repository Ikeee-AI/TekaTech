"""Find and pick published benchmarks for the catalog phones (S5-IK, 24 Nov 2026).

For each phone: one admin web-draft search (routers/web_drafts.py), then one result per test,
chosen by source quality and a sanity range for that test. Writes:
  - <out>/benchmarks_picked.json   every pick with its source (the review record)
  - <out>/gadget_benchmarks_prod.sql  inserts for the PROD phones (paste in the SQL Editor)
and, with --save-dev, inserts the picks for phones that also exist in DEV (matched by name).

The phone list comes from a gadgets JSON file (the public GET /gadgets of the target site), so
the SQL carries that site's exact gadget ids. Re-running the SQL is safe: it skips a phone's test
that already has a row.

Usage (from backend/):
  uv run python scripts/fill_benchmarks.py --gadgets prod_gadgets.json --out ../docs/evidence --save-dev
"""
import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import web_search  # noqa: E402
from routers.web_drafts import BENCHMARK_INSTRUCTIONS, BENCHMARK_SCHEMA, parse_drafts  # noqa: E402

# Most rigorous first: lab-style reviews with repeatable runs, then large review sites.
SOURCE_RANK = [
    "notebookcheck.net", "gsmarena.com", "tomsguide.com", "phonearena.com", "anandtech.com",
    "androidauthority.com", "techradar.com", "trustedreviews.com", "theverge.com", "zdnet.com",
    "nanoreview.net", "geekbench.com", "browser.geekbench.com", "antutu.com", "3dmark.com",
]

# (pattern on the lower-cased test name, unit, min, max): results outside are dropped.
SANITY = [
    (r"geekbench.*single", "points", 300, 4500),
    (r"geekbench.*multi", "points", 800, 13000),
    (r"antutu", "points", 150_000, 4_000_000),
    (r"wild life extreme", "points", 150, 9000),
    (r"wild life", "points", 1000, 30000),
]
FPS_RANGE = (5, 165)


def rank(url: str) -> int:
    host = (urlsplit(url).hostname or "").removeprefix("www.")
    for i, site in enumerate(SOURCE_RANK):
        if host == site or host.endswith("." + site):
            return i
    return len(SOURCE_RANK)


def sane(b) -> bool:
    if b.kind == "game" or b.unit.lower() == "fps":
        return b.unit.lower() == "fps" and FPS_RANGE[0] <= b.value <= FPS_RANGE[1]
    name = b.test.lower()
    for pattern, unit, lo, hi in SANITY:
        if re.search(pattern, name):
            return b.unit.lower() == unit and lo <= b.value <= hi
    return b.value > 0


def canonical_test(test: str) -> str:
    t = " ".join(test.split())
    low = t.lower()
    if "geekbench" in low and "single" in low:
        return "Geekbench 6 single-core" if "6" in low or "geekbench" == low.split()[0] else t
    if "geekbench" in low and "multi" in low:
        return "Geekbench 6 multi-core" if "6" in low or "geekbench" == low.split()[0] else t
    if low.startswith("antutu"):
        return "AnTuTu" + (" 10" if "10" in low else "")
    if "wild life extreme" in low:
        return "3DMark Wild Life Extreme" + (" Stress Test" if "stress" in low else "")
    return t


# Estimate/aggregator sites that publish modelled rather than measured numbers.
SKIP_SITES = {"fpsforecast.com", "ds.gtgroup.dev"}
# Local-language game names seen in reviews -> the English title.
GAME_NAMES = {
    "liên quân mobile": "Arena of Valor",
    "liên minh huyền thoại: tốc chiến": "League of Legends: Wild Rift",
    "peace elite": "PUBG Mobile (China: Peace Elite)",
    "bgmi": "BGMI (PUBG Mobile India)",
}
# Results checked by hand against the phone's chip and dropped (24 Nov 2026 review).
DROP = {
    ("vivo x200", "geekbench 6 single-core"),  # 1725: far below every Dimensity 9400 result
    ("vivo x200", "geekbench 6 multi-core"),   # same device page as the bad single-core score
}


def tidy(name: str, picks: list[dict]) -> list[dict]:
    """Second pass over a phone's picks: drop unusable rows, then keep one row per test/settings."""
    out = {}
    for b in picks:
        host = (urlsplit(b["source_url"]).hostname or "").removeprefix("www.")
        test = GAME_NAMES.get(b["test"].lower(), b["test"])
        test = re.sub(r"\s+score$", "", test, flags=re.IGNORECASE)
        if test.lower().startswith("antutu"):
            test = "AnTuTu"
        settings = b["settings"]
        if host in SKIP_SITES or (name.lower(), test.lower()) in DROP:
            continue
        if b["kind"] == "score" and b["unit"].lower() != "points":
            continue  # a chip score's fps sub-result duplicates the score itself
        if re.search(r"[\u3000-\u9fff]", f"{test} {settings or ''}"):
            continue  # untranslated duplicate of an English row
        key = (b["kind"], test.lower(), (settings or "").lower())
        if key in out and rank(out[key]["source_url"]) <= rank(b["source_url"]):
            continue
        out[key] = {**b, "test": test}
    rows = list(out.values())
    # A game row with no settings is dropped when the same game also has rows with settings.
    named = {r["test"].lower() for r in rows if r["kind"] == "game" and r["settings"]}
    return [r for r in rows if not (r["kind"] == "game" and not r["settings"] and r["test"].lower() in named)]


def pick(drafts):
    """One result per (kind, test, settings): best-ranked source; ties keep the first found."""
    best = {}
    for b in drafts:
        if not sane(b):
            continue
        b.test = canonical_test(b.test)
        key = (b.kind, b.test.lower(), (b.settings or "").lower(), b.unit.lower())
        if key not in best or rank(b.source_url) < rank(best[key].source_url):
            best[key] = b
    return list(best.values())


def sql_literal(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return repr(float(value)).rstrip("0").rstrip(".") if isinstance(value, float) else str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gadgets", required=True, help="JSON list from GET /gadgets of the target site")
    ap.add_argument("--out", required=True)
    ap.add_argument("--save-dev", action="store_true")
    ap.add_argument("--replace-dev", action="store_true", help="with --save-dev: delete the matched DEV phones' rows first")
    ap.add_argument("--only", default="", help="comma-separated gadget ids to (re)run")
    ap.add_argument("--rebuild", action="store_true", help="no searches: re-tidy the saved record, rewrite the SQL")
    args = ap.parse_args()

    phones = [g for g in json.loads(Path(args.gadgets).read_text(encoding="utf-8")) if g.get("category") == "Smartphone"]
    if args.only:
        wanted = set(args.only.split(","))
        phones = [g for g in phones if g["id"] in wanted]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    record_path = out / "benchmarks_picked.json"
    record = json.loads(record_path.read_text(encoding="utf-8")) if record_path.exists() else {}

    searches = tokens_in = tokens_out = 0
    for g in [] if args.rebuild else phones:
        name = g["name"] if g["name"].lower().startswith(g["brand"].lower()) else f"{g['brand']} {g['name']}"
        started = time.time()
        try:
            result = web_search.search(BENCHMARK_INSTRUCTIONS, f"Phone: {name}", max_output_tokens=4000, json_schema=BENCHMARK_SCHEMA)
        except web_search.WebSearchError as exc:
            print(f"SKIP {name}: {exc.reason}", flush=True)
            continue
        searches += result.searches
        tokens_in += result.input_tokens or 0
        tokens_out += result.output_tokens or 0
        _, drafts = parse_drafts("benchmarks", result.text)
        picks = pick(drafts)
        record[g["id"]] = {
            "name": name,
            "drafts": len(drafts),
            "picks": [b.model_dump() for b in picks],
        }
        record_path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"{name}: {len(drafts)} drafts -> {len(picks)} picked ({round(time.time() - started)} s)", flush=True)

    # SQL for the target site, from the whole (tidied) record.
    for entry in record.values():
        entry["final"] = tidy(entry["name"], entry["picks"])
    record_path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
    rows = [
        "  (" + ", ".join(sql_literal(v) for v in (gid, b["kind"], b["test"], b["settings"], b["value"], b["unit"], b["source_url"])) + ")"
        for gid, entry in record.items() for b in entry["final"]
    ]
    sql = (
        "-- Published benchmarks for the catalog phones (backend/scripts/fill_benchmarks.py, 24 Nov 2026):\n"
        "-- one result per test, best-ranked source, sanity-checked and reviewed. Needs\n"
        "-- backend/sql/gadget_benchmarks.sql first. Safe to re-run: a phone's test that already has a\n"
        "-- row is skipped, and a phone that is not in this database is skipped.\n"
        "begin;\n"
        "insert into public.gadget_benchmarks (gadget_id, kind, test, settings, value, unit, source_url)\n"
        "select v.gadget_id::uuid, v.kind, v.test, v.settings, v.value::numeric, v.unit, v.source_url\n"
        "from (values\n" + ",\n".join(rows) + "\n) as v(gadget_id, kind, test, settings, value, unit, source_url)\n"
        "join public.gadgets g on g.id = v.gadget_id::uuid\n"
        "where not exists (\n"
        "  select 1 from public.gadget_benchmarks x\n"
        "  where x.gadget_id = v.gadget_id::uuid and lower(x.test) = lower(v.test)\n"
        "    and coalesce(lower(x.settings), '') = coalesce(lower(v.settings), '')\n"
        ");\n"
        "notify pgrst, 'reload schema';\n"
        "commit;\n"
        "select count(*) as benchmark_rows from public.gadget_benchmarks;\n"
    )
    (out / "gadget_benchmarks_prod.sql").write_text(sql, encoding="utf-8")
    total = sum(len(e["final"]) for e in record.values())
    print(f"phones={len(record)} picks={total} searches={searches} input_tokens={tokens_in} output_tokens={tokens_out}")

    if args.save_dev:
        from supabase_client import supabase

        dev = supabase.table("gadgets").select("id, name, brand").execute().data or []
        by_name = {f"{d['brand']} {d['name']}".lower(): d["id"] for d in dev}
        by_name.update({d["name"].lower(): d["id"] for d in dev})
        saved = 0
        for entry in record.values():
            dev_id = by_name.get(entry["name"].lower())
            if not dev_id:
                continue
            if args.replace_dev:
                supabase.table("gadget_benchmarks").delete().eq("gadget_id", dev_id).execute()
            existing = supabase.table("gadget_benchmarks").select("test, settings").eq("gadget_id", dev_id).execute().data or []
            have = {(e["test"].lower(), (e["settings"] or "").lower()) for e in existing}
            rows = [
                {**b, "gadget_id": dev_id}
                for b in entry["final"]
                if (b["test"].lower(), (b["settings"] or "").lower()) not in have
            ]
            if rows:
                supabase.table("gadget_benchmarks").insert(rows).execute()
                saved += len(rows)
                print(f"DEV: saved {len(rows)} for {entry['name']}")
        print(f"DEV rows saved: {saved}")


if __name__ == "__main__":
    main()
