"""GET /admin/overview (#206): admin-only, read-only catalog, usage/spend and user counts.

Access for every caller type is covered by test_authorization_matrix.py; these tests check the numbers.
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

import routers.admin as admin

MANILA = timezone(timedelta(hours=8))


def _at_manila(days_ago: int, hour: int = 10) -> str:
    """An ISO timestamp (UTC, like PostgREST returns) for `days_ago` Manila days before today."""
    day = datetime.now(MANILA).date() - timedelta(days=days_ago)
    return datetime.combine(day, datetime.min.time(), tzinfo=MANILA).replace(hour=hour).astimezone(timezone.utc).isoformat()


@pytest.fixture
def accounts(monkeypatch, fake_supabase):
    """Give the fake Supabase an auth admin API that returns `n` users (counts only)."""
    def install(n=None, fail=False):
        def list_users(page=1, per_page=1000):
            if fail:
                raise RuntimeError("admin API down")
            start = (page - 1) * per_page
            return [SimpleNamespace(id=f"u{i}") for i in range(start, min(n, start + per_page))]

        fake_supabase.auth = SimpleNamespace(admin=SimpleNamespace(list_users=list_users))

    return install


def test_catalog_counts_indexed_pending_and_gadgets_without_specs(client, fake_supabase, accounts):
    accounts(3)
    fake_supabase.set_response("gadgets", "select", [
        {"id": "g1", "name": "iPhone 15"}, {"id": "g2", "name": "Poco x7 Pro"}, {"id": "g3", "name": "Rog Ally"},
    ])
    fake_supabase.set_response("spec_documents", "select", [
        {"gadget_id": "g1", "indexing_status": "indexed"},
        {"gadget_id": "g1", "indexing_status": "indexed"},
        {"gadget_id": "g2", "indexing_status": "pending"},
    ])

    resp = client.get("/admin/overview")

    assert resp.status_code == 200
    catalog = resp.json()["catalog"]
    assert catalog["gadgets"] == 3
    assert catalog["gadgets_with_indexed_specs"] == 1
    assert catalog["gadgets_without_specs"] == ["Rog Ally"]
    assert catalog["spec_chunks"] == {"total": 3, "indexed": 2, "not_indexed": 1}
    assert {r["name"]: (r["indexed"], r["pending"]) for r in catalog["per_gadget"]} == {
        "iPhone 15": (2, 0), "Poco x7 Pro": (0, 1), "Rog Ally": (0, 0),
    }


def test_usage_buckets_by_manila_day_and_estimates_cost(client, fake_supabase, accounts):
    accounts(0)
    fake_supabase.set_response("query_history", "select", [
        {"created_at": _at_manila(0), "embedding_tokens": 10, "prompt_tokens": 1000, "completion_tokens": 500},
        {"created_at": _at_manila(0, hour=23), "embedding_tokens": 10, "prompt_tokens": 1000, "completion_tokens": 500},
        {"created_at": _at_manila(2), "embedding_tokens": None, "prompt_tokens": None, "completion_tokens": None},
        {"created_at": _at_manila(30), "embedding_tokens": 99, "prompt_tokens": 99, "completion_tokens": 99},  # outside window
    ])

    usage = client.get("/admin/overview").json()["usage"]

    assert usage["window_days"] == 14 and len(usage["days"]) == 14
    assert usage["days"][-1]["date"] == datetime.now(MANILA).date().isoformat()
    today, two_days_ago = usage["days"][-1], usage["days"][-3]
    assert today["questions"] == 2 and today["prompt_tokens"] == 2000 and today["completion_tokens"] == 1000
    assert two_days_ago["questions"] == 1 and two_days_ago["prompt_tokens"] == 0
    assert usage["totals"]["questions"] == 3
    assert usage["rows_without_tokens"] == 1
    # 20 embedding x $0.02 + 2000 input x $0.25 + 1000 output x $2.00, per million tokens
    assert usage["totals"]["estimated_cost_usd"] == pytest.approx((20 * 0.02 + 2000 * 0.25 + 1000 * 2.00) / 1e6, abs=1e-4)
    assert usage["truncated"] is False
    assert "Estimate for logged answers only" in usage["spend_note"]
    # the window filter is sent to the database, not applied after fetching everything
    assert any(f[0] == "query_history" and f[1] == "gte" for f in fake_supabase.filters)


def test_usage_falls_back_to_question_counts_without_token_columns(client, fake_supabase, accounts, monkeypatch):
    accounts(0)
    calls = []

    def history(since):
        calls.append(since)
        return [{"created_at": _at_manila(1)}], False

    monkeypatch.setattr(admin, "_history_rows", history)
    usage = client.get("/admin/overview").json()["usage"]
    assert usage["token_columns_present"] is False
    assert usage["totals"]["questions"] == 1
    assert usage["totals"]["estimated_cost_usd"] == 0


def test_users_counts_accounts_across_pages_and_distinct_lists(client, fake_supabase, accounts):
    accounts(1500)
    fake_supabase.set_response("user_gadgets", "select", [
        {"user_id": "a"}, {"user_id": "a"}, {"user_id": "b"},
    ])
    users = client.get("/admin/overview").json()["users"]
    assert users == {"accounts": 1500, "my_gadgets_lists": 2}


def test_a_failing_account_count_does_not_break_the_page(client, fake_supabase, accounts):
    accounts(fail=True)
    resp = client.get("/admin/overview")
    assert resp.status_code == 200
    assert resp.json()["users"]["accounts"] is None


def test_a_missing_user_gadgets_table_does_not_break_the_page(client, fake_supabase, accounts, monkeypatch):
    accounts(1)
    real_table = fake_supabase.table

    def table(name):
        if name == "user_gadgets":
            raise RuntimeError("Could not find the table 'public.user_gadgets' in the schema cache")
        return real_table(name)

    monkeypatch.setattr(fake_supabase, "table", table)
    resp = client.get("/admin/overview")
    assert resp.status_code == 200
    assert resp.json()["users"] == {"accounts": 1, "my_gadgets_lists": None}


def test_no_emails_or_user_ids_leave_the_endpoint(client, fake_supabase, accounts):
    accounts(2)
    fake_supabase.set_response("user_gadgets", "select", [{"user_id": "secret-user-id"}])
    body = client.get("/admin/overview").text
    assert "secret-user-id" not in body and "@" not in body
