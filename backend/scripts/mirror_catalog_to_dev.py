"""Copy the production phone catalog into TekaTech-dev, for the Docker/judge setup (docs/docker.md).

Reads ONLY the production API's public catalog routes (GET /gadgets, /gadgets/{id}/specs,
/gadgets/{id}/benchmarks: no key, no sign-in) and writes ONLY to TekaTech-dev through
backend/.env. Refuses to run unless backend/.env points at the dev project (same guard as
seed_dev.py). Production is never written to.

For each production gadget whose name + brand is not already in dev: inserts the gadget with
the same id, its spec chunks (pending), and its benchmark rows. With --index it then embeds the
copied pending chunks (one OpenAI embeddings call per batch, text-embedding-3-small) and marks
them indexed, the same write as POST /gadgets/{id}/specs/{spec_id}/index. Existing dev rows are
never changed or deleted. Safe to rerun: already-copied gadgets are skipped.

Usage, from backend/:
    uv run python scripts/mirror_catalog_to_dev.py            # dry run: prints the plan only
    uv run python scripts/mirror_catalog_to_dev.py --apply --index
"""
import argparse
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402  (reads .env only; no network)
from scripts.seed_dev import check_target  # noqa: E402

PROD_API = "https://tekatech-api-production-549b48c9.up.railway.app"
GADGET_FIELDS = ("id", "name", "brand", "category", "release_date", "price_php", "image_url",
                 "price_source_url", "price_checked_at", "store_url", "price_is_launch")
SPEC_FIELDS = ("gadget_id", "content", "source_url", "chunk_index", "verified_at")
BENCH_FIELDS = ("gadget_id", "kind", "test", "settings", "value", "unit", "source_url", "checked_at")
EMBED_BATCH = 50


def get_json(path: str):
    req = urllib.request.Request(PROD_API + path, headers={"User-Agent": "tekatech-mirror"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def as_list(data):
    if isinstance(data, list):
        return data
    return data.get("items") or data.get("gadgets") or []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="write to dev (default: dry run)")
    parser.add_argument("--index", action="store_true", help="embed the copied chunks (OpenAI)")
    args = parser.parse_args()

    check_target(settings.supabase_url)  # exits before any network call unless dev
    from supabase_client import supabase  # noqa: E402  (after the guard)

    prod = as_list(get_json("/gadgets"))
    dev = supabase.table("gadgets").select("id,name,brand").execute().data
    dev_keys = {(g["name"].strip().lower(), g["brand"].strip().lower()) for g in dev}
    dev_ids = {g["id"] for g in dev}

    plan = []
    for g in prod:
        key = (g["name"].strip().lower(), g["brand"].strip().lower())
        if key in dev_keys or g["id"] in dev_ids:
            print(f"skip (already in dev): {g['brand']} {g['name']}")
            continue
        specs = as_list(get_json(f"/gadgets/{g['id']}/specs"))
        benches = as_list(get_json(f"/gadgets/{g['id']}/benchmarks"))
        plan.append((g, specs, benches))
        print(f"copy: {g['brand']} {g['name']}: {len(specs)} spec chunks, {len(benches)} benchmarks")

    total_specs = sum(len(s) for _, s, _ in plan)
    total_bench = sum(len(b) for _, _, b in plan)
    print(f"\nprod gadgets {len(prod)}, to copy {len(plan)}, spec chunks {total_specs}, "
          f"benchmarks {total_bench}")
    if not args.apply:
        print("Dry run: nothing written. Add --apply (and --index) to copy.")
        return 0

    new_spec_ids = []
    for g, specs, benches in plan:
        supabase.table("gadgets").insert({k: g.get(k) for k in GADGET_FIELDS}).execute()
        if specs:
            rows = [{**{k: s.get(k) for k in SPEC_FIELDS}, "indexing_status": "pending"}
                    for s in specs]
            res = supabase.table("spec_documents").insert(rows).execute()
            new_spec_ids += [(r["id"], r["content"]) for r in res.data]
        if benches:
            supabase.table("gadget_benchmarks").insert(
                [{k: b.get(k) for k in BENCH_FIELDS} for b in benches]).execute()
    print(f"inserted {len(plan)} gadgets, {len(new_spec_ids)} spec chunks, {total_bench} benchmarks")

    if not args.index or not new_spec_ids:
        return 0
    from embeddings import embed_texts  # noqa: E402

    done = 0
    for i in range(0, len(new_spec_ids), EMBED_BATCH):
        batch = new_spec_ids[i:i + EMBED_BATCH]
        vectors = embed_texts([content for _, content in batch])
        for (spec_id, content), vector in zip(batch, vectors):
            (supabase.table("spec_documents")
             .update({"embedding": vector, "indexing_status": "indexed"})
             .eq("id", spec_id).eq("content", content).execute())
            done += 1
    print(f"indexed {done} spec chunks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
