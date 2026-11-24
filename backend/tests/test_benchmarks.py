"""Game and chip benchmarks (routers/benchmarks.py, sql/gadget_benchmarks.sql)."""
from unittest.mock import patch
from uuid import uuid4

GADGET = str(uuid4())
ROW = {
    "id": str(uuid4()),
    "gadget_id": GADGET,
    "kind": "game",
    "test": "Genshin Impact",
    "settings": "High, 60 fps target",
    "value": 52,
    "unit": "fps",
    "source_url": "https://example.com/review",
    "checked_at": "2026-11-24",
}
BODY = {
    "kind": "game",
    "test": "  Genshin   Impact ",
    "settings": "High, 60 fps target",
    "value": 52,
    "unit": "fps",
    "source_url": "https://example.com/review",
}


def test_list_is_public_and_returns_rows(client, fake_supabase):
    fake_supabase.set_response("gadget_benchmarks", "select", [ROW])
    resp = client.get(f"/gadgets/{GADGET}/benchmarks")
    assert resp.status_code == 200
    assert resp.json()[0]["test"] == "Genshin Impact"
    assert "cache-control" not in resp.headers  # the admin UI re-reads right after a write


def test_add_saves_cleaned_row_and_invalidates_answers(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET}])
    fake_supabase.set_response("gadget_benchmarks", "select", [])
    fake_supabase.set_response("gadget_benchmarks", "insert", [ROW])
    with patch("routers.benchmarks.answer_cache.invalidate_gadget") as invalidate:
        resp = client.post(f"/gadgets/{GADGET}/benchmarks", json=BODY)
    assert resp.status_code == 201
    inserted = fake_supabase.writes[-1][2]
    assert inserted["test"] == "Genshin Impact"
    assert inserted["gadget_id"] == GADGET
    invalidate.assert_called_once()


def test_add_needs_a_source_link(client, fake_supabase):
    for bad in ("", "javascript:alert(1)", "example.com"):
        resp = client.post(f"/gadgets/{GADGET}/benchmarks", json={**BODY, "source_url": bad})
        assert resp.status_code == 422, bad


def test_add_rejects_bad_values(client, fake_supabase):
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json={**BODY, "kind": "rumour"}).status_code == 422
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json={**BODY, "value": -1}).status_code == 422
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json={**BODY, "test": "   "}).status_code == 422
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json={**BODY, "unit": "x" * 21}).status_code == 422
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json={**BODY, "checked_at": "2999-01-01"}).status_code == 422


def test_add_unknown_gadget_is_404(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json=BODY).status_code == 404


def test_add_refuses_past_the_per_gadget_cap(client, fake_supabase):
    from routers.benchmarks import MAX_BENCHMARKS_PER_GADGET

    fake_supabase.set_response("gadgets", "select", [{"id": GADGET}])
    fake_supabase.set_response("gadget_benchmarks", "select", [{"id": str(uuid4())}] * MAX_BENCHMARKS_PER_GADGET)
    assert client.post(f"/gadgets/{GADGET}/benchmarks", json=BODY).status_code == 409


def test_update_clears_settings_and_404s_when_missing(client, fake_supabase):
    fake_supabase.set_response("gadget_benchmarks", "update", [ROW])
    resp = client.put(f"/gadgets/{GADGET}/benchmarks/{ROW['id']}", json={**BODY, "settings": " "})
    assert resp.status_code == 200
    assert fake_supabase.writes[-1][2]["settings"] is None
    fake_supabase.set_response("gadget_benchmarks", "update", [])
    assert client.put(f"/gadgets/{GADGET}/benchmarks/{ROW['id']}", json=BODY).status_code == 404


def test_delete(client, fake_supabase):
    fake_supabase.set_response("gadget_benchmarks", "delete", [ROW])
    assert client.delete(f"/gadgets/{GADGET}/benchmarks/{ROW['id']}").status_code == 204
    fake_supabase.set_response("gadget_benchmarks", "delete", [])
    assert client.delete(f"/gadgets/{GADGET}/benchmarks/{ROW['id']}").status_code == 404
