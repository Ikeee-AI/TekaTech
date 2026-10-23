import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import seed_dev  # noqa: E402

PACK = json.loads(seed_dev.SOURCES_FILE.read_text(encoding="utf-8"))
# Count from the pack so adding verified snippets never breaks these tests.
N = sum(s["gadget"] in seed_dev.SPEC_GADGETS for s in PACK["snippets"])


def _fake_with_gadgets(fake_supabase, spec_rows):
    fake_supabase.set_response("gadgets", "select", [{"id": "gadget-1"}])
    fake_supabase.set_response("spec_documents", "select", spec_rows)
    fake_supabase.set_response("spec_documents", "insert", [{"id": "spec-1", "indexing_status": "pending"}])
    return fake_supabase


@pytest.mark.parametrize("url", [
    "https://lqswcmkzygqmnblaukco.supabase.co",  # live
    "https://other.supabase.co",
    "https://efdgguybkampozuvqjrz.supabase.co.evil.example",
    "",
])
def test_check_target_refuses_anything_but_dev(url):
    with pytest.raises(SystemExit) as exc:
        seed_dev.check_target(url)
    assert exc.value.code == 1


def test_check_target_accepts_dev():
    assert seed_dev.check_target("https://efdgguybkampozuvqjrz.supabase.co") == seed_dev.DEV_PROJECT_REF


def test_seed_specs_saves_and_indexes_every_snippet(fake_supabase):
    fake = _fake_with_gadgets(fake_supabase, [])
    calls = []

    def embed(texts):
        calls.append(texts)
        return [[0.1]] * len(texts)

    counts = seed_dev.seed_specs(fake, embed, PACK)

    assert counts == {"saved": N, "skipped": 0, "indexed": N, "index_failed": 0}
    assert N > 0 and len(calls) == 1  # one batched embedding call, not one per snippet
    inserts = [row for table, op, row in fake.writes if table == "spec_documents" and op == "insert"]
    assert all(row["indexing_status"] == "pending" and row["embedding"] is None for row in inserts)
    # verified_at is when the fact was checked (from the pack), not when it was seeded.
    assert {row["verified_at"] for row in inserts} == {PACK["gadgets"][k]["accessed"] for k in seed_dev.SPEC_GADGETS}


def test_seed_specs_rerun_skips_indexed_snippets_without_calling_openai(fake_supabase):
    fake = _fake_with_gadgets(fake_supabase, [{"id": "spec-1", "indexing_status": "indexed"}])

    def embed(texts):
        raise AssertionError("must not embed already-indexed specs")

    counts = seed_dev.seed_specs(fake, embed, PACK)

    assert counts == {"saved": 0, "skipped": N, "indexed": 0, "index_failed": 0}
    assert not [w for w in fake.writes if w[0] == "spec_documents"]


def test_seed_specs_embedding_failure_keeps_saved_text_pending(fake_supabase):
    fake = _fake_with_gadgets(fake_supabase, [])

    def embed(texts):
        raise RuntimeError("provider down")

    counts = seed_dev.seed_specs(fake, embed, PACK)

    assert counts["saved"] == N and counts["index_failed"] == N and counts["indexed"] == 0
    assert not [w for w in fake.writes if w[0] == "spec_documents" and w[1] == "update"]
