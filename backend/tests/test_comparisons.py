from uuid import uuid4

import pytest


def _gadgets_exist(fake_supabase, ids):
    fake_supabase.set_response("gadgets", "select", [{"id": i} for i in ids])


def _link_available(fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])  # slug is available
    fake_supabase.set_response(
        "comparison_links",
        "insert",
        [{"id": str(uuid4()), "slug": "abc1234", "gadget_ids": [], "view_count": 0}],
    )


def test_create_comparison_needs_two_gadgets(client, fake_supabase):
    resp = client.post("/comparisons", json={"gadget_ids": [str(uuid4())]})
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["msg"] == "Pick at least 2 different gadgets to compare."
    assert fake_supabase.writes == []


def test_create_comparison_empty_list_is_422(client, fake_supabase):
    resp = client.post("/comparisons", json={"gadget_ids": []})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


def test_create_comparison_same_gadget_twice_is_not_a_comparison(client, fake_supabase):
    same = str(uuid4())
    _gadgets_exist(fake_supabase, [same])
    _link_available(fake_supabase)
    resp = client.post("/comparisons", json={"gadget_ids": [same, same]})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


def test_create_comparison_saves_deduplicated_ids_in_order(client, fake_supabase):
    a, b = str(uuid4()), str(uuid4())
    _gadgets_exist(fake_supabase, [a, b])
    _link_available(fake_supabase)
    resp = client.post("/comparisons", json={"gadget_ids": [b, a, b]})
    assert resp.status_code == 201
    inserts = [p for table, op, p in fake_supabase.writes if table == "comparison_links" and op == "insert"]
    assert inserts[0]["gadget_ids"] == [b, a]


def test_create_comparison_success(client, fake_supabase):
    ids = [str(uuid4()), str(uuid4())]
    _gadgets_exist(fake_supabase, ids)
    _link_available(fake_supabase)
    resp = client.post("/comparisons", json={"gadget_ids": ids})
    assert resp.status_code == 201
    assert "slug" in resp.json()


def test_create_comparison_with_missing_gadget_is_404(client, fake_supabase):
    existing, missing = str(uuid4()), str(uuid4())
    _gadgets_exist(fake_supabase, [existing])
    _link_available(fake_supabase)
    resp = client.post("/comparisons", json={"gadget_ids": [existing, missing]})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "One or more gadgets in this comparison no longer exist."
    assert fake_supabase.writes == []


def test_create_comparison_gadget_lookup_failure_is_503(client, fake_supabase, monkeypatch):
    real_table = fake_supabase.table

    class Broken:
        def __getattr__(self, name):
            def chain(*a, **k):
                if name == "execute":
                    raise RuntimeError("database unreachable")
                return self
            return chain

    monkeypatch.setattr(fake_supabase, "table", lambda name: Broken() if name == "gadgets" else real_table(name))
    resp = client.post("/comparisons", json={"gadget_ids": [str(uuid4()), str(uuid4())]})
    assert resp.status_code == 503
    assert "database" not in resp.json()["detail"]
    assert fake_supabase.writes == []


def test_resolve_comparison_not_found(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])
    resp = client.get("/comparisons/zzzzzzz")
    assert resp.status_code == 404


@pytest.mark.parametrize("slug", ["doesnotexist", "abc123", "abc12345", "ABC1234", "abc-123", "abc_123", "abc%20123"])
def test_resolve_comparison_malformed_slug_is_422_without_a_lookup(client, fake_supabase, slug):
    resp = client.get(f"/comparisons/{slug}")
    assert resp.status_code == 422
    assert fake_supabase.filters == []
    assert fake_supabase.rpc_calls == []


def test_generated_slugs_match_the_route_pattern():
    import re

    from routers.comparisons import SLUG_PATTERN, _generate_slug

    assert all(re.fullmatch(SLUG_PATTERN, _generate_slug()) for _ in range(200))


def test_resolve_comparison_is_limited_to_60_per_minute(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])
    for _ in range(60):
        assert client.get("/comparisons/zzzzzzz").status_code == 404
    assert client.get("/comparisons/zzzzzzz").status_code == 429


def test_resolve_comparison_success(client, fake_supabase):
    fake_supabase.set_response(
        "comparison_links",
        "select",
        [{"slug": "abc1234", "gadget_ids": ["id1", "id2"], "view_count": 3}],
    )
    resp = client.get("/comparisons/abc1234")
    assert resp.status_code == 200
    assert resp.json()["gadget_ids"] == ["id1", "id2"]


@pytest.mark.parametrize("fail_at", ["rpc", "execute"])
def test_resolve_comparison_survives_view_count_failure(client, fake_supabase, monkeypatch, fail_at):
    """The view count is a statistic: a failing increment must not break the link."""
    fake_supabase.set_response(
        "comparison_links", "select", [{"slug": "abc1234", "gadget_ids": ["id1", "id2"], "view_count": 3}]
    )

    class FailingRpc:
        def execute(self):
            raise RuntimeError("function increment_comparison_view_count does not exist")

    def broken_rpc(*a, **k):
        if fail_at == "rpc":
            raise RuntimeError("connection reset")
        return FailingRpc()

    monkeypatch.setattr(fake_supabase, "rpc", broken_rpc)
    resp = client.get("/comparisons/abc1234")
    assert resp.status_code == 200
    assert resp.json() == {"slug": "abc1234", "gadget_ids": ["id1", "id2"]}


def test_create_comparison_rejects_too_many_gadgets(client, fake_supabase):
    resp = client.post("/comparisons", json={"gadget_ids": [str(uuid4()) for _ in range(6)]})
    assert resp.status_code == 422


def test_create_comparison_rate_limited_after_20_per_hour(client, fake_supabase):
    ids = [str(uuid4()), str(uuid4())]
    _gadgets_exist(fake_supabase, ids)
    _link_available(fake_supabase)
    for _ in range(20):
        resp = client.post("/comparisons", json={"gadget_ids": ids})
        assert resp.status_code == 201
    resp = client.post("/comparisons", json={"gadget_ids": ids})
    assert resp.status_code == 429
