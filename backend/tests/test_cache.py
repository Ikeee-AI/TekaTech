from uuid import uuid4

import cache
from factories import sample_gadget


# --- cache.py on its own ---

def test_get_or_load_serves_second_call_from_cache():
    calls = []

    def load():
        calls.append(1)
        return "value"

    assert cache.get_or_load("ns", ("k",), 60, load) == ("value", False)
    assert cache.get_or_load("ns", ("k",), 60, load) == ("value", True)
    assert len(calls) == 1


def test_expired_entry_is_reloaded():
    cache.get_or_load("ns", ("k",), 0, lambda: "old")
    assert cache.get_or_load("ns", ("k",), 60, lambda: "new") == ("new", False)


def test_invalidate_only_clears_named_namespace():
    cache.get_or_load("a", ("k",), 60, lambda: 1)
    cache.get_or_load("b", ("k",), 60, lambda: 2)
    cache.invalidate("a")
    assert cache.get_or_load("a", ("k",), 60, lambda: 10) == (10, False)
    assert cache.get_or_load("b", ("k",), 60, lambda: 20) == (2, True)


def test_load_that_raises_stores_nothing():
    def boom():
        raise RuntimeError("db down")
    try:
        cache.get_or_load("ns", ("k",), 60, boom)
    except RuntimeError:
        pass
    assert cache.get_or_load("ns", ("k",), 60, lambda: "ok") == ("ok", False)


def test_write_during_load_does_not_store_pre_write_rows():
    # A read that started before a write finishes after the write's invalidate();
    # storing its rows would serve stale data for the whole TTL.
    def load_racing_a_write():
        cache.invalidate("ns")
        return "read before write"
    assert cache.get_or_load("ns", ("k",), 60, load_racing_a_write) == ("read before write", False)
    assert cache.get_or_load("ns", ("k",), 60, lambda: "fresh") == ("fresh", False)


def test_entry_count_is_capped(monkeypatch):
    monkeypatch.setattr(cache, "MAX_ENTRIES", 3)
    for i in range(10):
        cache.get_or_load("ns", (i,), 60, lambda: i)
    assert len(cache._entries) == 3
    # Oldest go first; the newest key is still cached.
    assert cache.get_or_load("ns", (9,), 60, lambda: -1) == (9, True)


# --- routes ---

def test_list_gadgets_second_read_is_a_cache_hit(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [sample_gadget()])
    first = client.get("/gadgets")
    fake_supabase.set_response("gadgets", "select", [])
    second = client.get("/gadgets")
    assert first.headers["X-Cache"] == "MISS"
    assert second.headers["X-Cache"] == "HIT"
    assert second.json() == first.json()
    assert "Cache-Control" not in second.headers


def test_list_gadgets_cache_is_keyed_by_filters(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [sample_gadget()])
    client.get("/gadgets")
    resp = client.get("/gadgets?brand=Apple")
    assert resp.headers["X-Cache"] == "MISS"


def test_create_gadget_invalidates_list(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    client.get("/gadgets")
    new = sample_gadget()
    fake_supabase.set_response("gadgets", "insert", [new])
    fake_supabase.set_response("gadgets", "select", [new])
    assert client.post("/gadgets", json={"name": new["name"], "brand": new["brand"], "category": new["category"]}).status_code == 201
    resp = client.get("/gadgets")
    assert resp.headers["X-Cache"] == "MISS"
    assert len(resp.json()) == 1


def test_update_gadget_invalidates_single_gadget(client, fake_supabase):
    gadget = sample_gadget()
    fake_supabase.set_response("gadgets", "select", [gadget])
    client.get(f"/gadgets/{gadget['id']}")
    renamed = {**gadget, "name": "Renamed"}
    fake_supabase.set_response("gadgets", "update", [renamed])
    fake_supabase.set_response("gadgets", "select", [renamed])
    client.patch(f"/gadgets/{gadget['id']}", json={"name": "Renamed"})
    resp = client.get(f"/gadgets/{gadget['id']}")
    assert resp.headers["X-Cache"] == "MISS"
    assert resp.json()["name"] == "Renamed"


def test_delete_gadget_invalidates_list(client, fake_supabase):
    gadget = sample_gadget()
    fake_supabase.set_response("gadgets", "select", [gadget])
    client.get("/gadgets")
    fake_supabase.set_response("gadgets", "delete", [gadget])
    fake_supabase.set_response("gadgets", "select", [])
    assert client.delete(f"/gadgets/{gadget['id']}").status_code == 204
    assert client.get("/gadgets").json() == []


def test_missing_gadget_404_is_not_cached(client, fake_supabase):
    gadget_id = uuid4()
    fake_supabase.set_response("gadgets", "select", [])
    assert client.get(f"/gadgets/{gadget_id}").status_code == 404
    fake_supabase.set_response("gadgets", "select", [sample_gadget(id=str(gadget_id))])
    assert client.get(f"/gadgets/{gadget_id}").status_code == 200


def test_stats_send_browser_cache_header_and_hit(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": "g1"}])
    fake_supabase.set_response("spec_documents", "select", [])
    first = client.get("/stats/spec-coverage")
    second = client.get("/stats/spec-coverage")
    assert first.headers["Cache-Control"] == "public, max-age=60"
    assert (first.headers["X-Cache"], second.headers["X-Cache"]) == ("MISS", "HIT")


def test_spec_ingest_invalidates_spec_coverage(client, fake_supabase):
    gadget_id = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id}])
    fake_supabase.set_response("spec_documents", "select", [])
    assert client.get("/stats/spec-coverage").json() == {"covered": 0, "total": 1}
    fake_supabase.set_response("spec_documents", "insert", [{"id": str(uuid4())}])
    fake_supabase.set_response("spec_documents", "select", [{"gadget_id": gadget_id}])
    assert client.post(f"/gadgets/{gadget_id}/specs", json={"raw_text": "Display: 6.2 inch"}).status_code == 201
    assert client.get("/stats/spec-coverage").json() == {"covered": 1, "total": 1}
