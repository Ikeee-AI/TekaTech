from uuid import uuid4


def test_create_comparison_needs_two_gadgets(client, fake_supabase):
    resp = client.post("/comparisons", json={"gadget_ids": [str(uuid4())]})
    assert resp.status_code == 400


def test_create_comparison_success(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])  # slug is available
    fake_supabase.set_response(
        "comparison_links",
        "insert",
        [{"id": str(uuid4()), "slug": "abc1234", "gadget_ids": [], "view_count": 0}],
    )
    resp = client.post("/comparisons", json={"gadget_ids": [str(uuid4()), str(uuid4())]})
    assert resp.status_code == 201
    assert "slug" in resp.json()


def test_resolve_comparison_not_found(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])
    resp = client.get("/comparisons/doesnotexist")
    assert resp.status_code == 404


def test_resolve_comparison_success(client, fake_supabase):
    fake_supabase.set_response(
        "comparison_links",
        "select",
        [{"slug": "abc1234", "gadget_ids": ["id1", "id2"], "view_count": 3}],
    )
    resp = client.get("/comparisons/abc1234")
    assert resp.status_code == 200
    assert resp.json()["gadget_ids"] == ["id1", "id2"]


def test_create_comparison_rejects_too_many_gadgets(client, fake_supabase):
    resp = client.post("/comparisons", json={"gadget_ids": [str(uuid4()) for _ in range(6)]})
    assert resp.status_code == 422


def test_create_comparison_rate_limited_after_20_per_hour(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])
    fake_supabase.set_response(
        "comparison_links", "insert", [{"id": str(uuid4()), "slug": "abc1234", "gadget_ids": [], "view_count": 0}]
    )
    ids = [str(uuid4()), str(uuid4())]
    for _ in range(20):
        resp = client.post("/comparisons", json={"gadget_ids": ids})
        assert resp.status_code == 201
    resp = client.post("/comparisons", json={"gadget_ids": ids})
    assert resp.status_code == 429