from unittest.mock import patch
from uuid import uuid4


def test_list_specs_empty(client, fake_supabase):
    fake_supabase.set_response("spec_documents", "select", [])
    resp = client.get(f"/gadgets/{uuid4()}/specs")
    assert resp.status_code == 200
    assert resp.json() == []


def test_ingest_spec_gadget_not_found(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    resp = client.post(f"/gadgets/{uuid4()}/specs", json={"raw_text": "Display: 6.2 inch"})
    assert resp.status_code == 404


def test_ingest_spec_success(client, fake_supabase):
    gadget_id = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id}])
    fake_supabase.set_response(
        "spec_documents",
        "insert",
        [{"id": str(uuid4()), "gadget_id": gadget_id, "content": "chunk", "chunk_index": 0}],
    )
    # Real chunk_text() runs for real here â€” only the OpenAI network call is faked
    with patch("routers.specs.embed_texts", side_effect=AssertionError("Saving must not call OpenAI")) as embed:
        resp = client.post(
            f"/gadgets/{gadget_id}/specs",
            json={"raw_text": "Display: 6.2-inch AMOLED, 120Hz refresh rate."},
        )
    assert resp.status_code == 201
    assert resp.json()["chunks_created"] == 1
    assert resp.json()["indexing_status"] == "pending"
    embed.assert_not_called()
    inserted = fake_supabase.writes[-1][2]
    assert inserted[0]["embedding"] is None
    assert inserted[0]["indexing_status"] == "pending"
    assert inserted[0]["content"] == "Display: 6.2-inch AMOLED, 120Hz refresh rate."


def test_ingest_spec_rejects_empty_text(client, fake_supabase):
    resp = client.post(f"/gadgets/{uuid4()}/specs", json={"raw_text": ""})
    assert resp.status_code == 422

def test_ingest_spec_rejects_missing_text(client, fake_supabase):
    resp = client.post(f"/gadgets/{uuid4()}/specs", json={})
    assert resp.status_code == 422

def test_ingest_spec_rejects_overlong_text(client, fake_supabase):
    resp = client.post(f"/gadgets/{uuid4()}/specs", json={"raw_text": "x" * 20_001})
    assert resp.status_code == 422


def test_ingest_spec_multiple_paragraphs_creates_multiple_chunks(client, fake_supabase):
    gadget_id = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id}])
    fake_supabase.set_response(
        "spec_documents",
        "insert",
        [
            {"id": str(uuid4()), "gadget_id": gadget_id, "content": "c1", "chunk_index": 0},
            {"id": str(uuid4()), "gadget_id": gadget_id, "content": "c2", "chunk_index": 1},
        ],
    )
    raw_text = "Display: 6.2-inch AMOLED, 120Hz.\n\nBattery: 4000mAh, 25W fast charging."
    with patch("routers.specs.embed_texts", side_effect=AssertionError("Saving must not call OpenAI")) as embed:
        resp = client.post(f"/gadgets/{gadget_id}/specs", json={"raw_text": raw_text})
    assert resp.status_code == 201
    assert resp.json()["chunks_created"] == 2
    embed.assert_not_called()
    assert all(row["embedding"] is None and row["indexing_status"] == "pending" for row in fake_supabase.writes[-1][2])

def _pending_spec(fake_supabase, content="Battery: 4000mAh"):
    gadget_id, spec_id = str(uuid4()), str(uuid4())
    fake_supabase.set_response("spec_documents", "select", [
        {"id": spec_id, "content": content, "indexing_status": "pending"}
    ])
    return gadget_id, spec_id


def test_index_spec_success_checks_original_content(client, fake_supabase):
    gadget_id, spec_id = _pending_spec(fake_supabase)
    fake_supabase.set_response("spec_documents", "update", [{"id": spec_id}])
    vector = [0.1] * 1536
    with patch("routers.specs.embed_texts", return_value=[vector]) as embed:
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")
    assert resp.status_code == 200
    assert resp.json()["indexing_status"] == "indexed"
    embed.assert_called_once_with(["Battery: 4000mAh"])
    assert ("spec_documents", "content", "Battery: 4000mAh") in fake_supabase.filters
    assert ("spec_documents", "gadget_id", gadget_id) in fake_supabase.filters
    assert fake_supabase.writes == [("spec_documents", "update", {"embedding": vector, "indexing_status": "indexed"})]


def test_index_spec_provider_failure_preserves_saved_text(client, fake_supabase):
    gadget_id, spec_id = _pending_spec(fake_supabase)
    with patch("routers.specs.embed_texts", side_effect=RuntimeError("provider unavailable")):
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")
    assert resp.status_code == 503
    assert "specs are saved" in resp.json()["detail"]
    assert fake_supabase.writes == []


def test_index_spec_already_indexed_does_not_spend_again(client, fake_supabase):
    gadget_id, spec_id = _pending_spec(fake_supabase)
    fake_supabase.set_response("spec_documents", "select", [
        {"id": spec_id, "content": "Battery", "indexing_status": "indexed"}
    ])
    with patch("routers.specs.embed_texts") as embed:
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")
    assert resp.status_code == 200
    embed.assert_not_called()
    assert fake_supabase.writes == []


def test_index_spec_missing_returns_404(client, fake_supabase):
    with patch("routers.specs.embed_texts") as embed:
        resp = client.post(f"/gadgets/{uuid4()}/specs/{uuid4()}/index")
    assert resp.status_code == 404
    embed.assert_not_called()


def test_index_spec_changed_during_embedding_returns_conflict(client, fake_supabase):
    gadget_id, spec_id = _pending_spec(fake_supabase)
    fake_supabase.set_response("spec_documents", "update", [])
    with patch("routers.specs.embed_texts", return_value=[[0.1] * 1536]):
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")
    assert resp.status_code == 409
    assert ("spec_documents", "content", "Battery: 4000mAh") in fake_supabase.filters


def test_index_spec_invalid_provider_response_is_not_written(client, fake_supabase):
    gadget_id, spec_id = _pending_spec(fake_supabase)
    with patch("routers.specs.embed_texts", return_value=[]):
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")
    assert resp.status_code == 503
    assert fake_supabase.writes == []


def test_index_spec_over_token_limit_skips_provider(client, fake_supabase):
    gadget_id, spec_id = _pending_spec(fake_supabase)
    with patch("routers.specs.count_embedding_tokens", return_value=6001), patch("routers.specs.embed_texts") as embed:
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")
    assert resp.status_code == 422
    embed.assert_not_called()
    assert fake_supabase.writes == []


def test_index_spec_requires_login(client, fake_supabase):
    from main import app
    from auth import get_current_user
    previous = app.dependency_overrides.pop(get_current_user)
    try:
        with patch("routers.specs.embed_texts") as embed:
            resp = client.post(f"/gadgets/{uuid4()}/specs/{uuid4()}/index")
        assert resp.status_code == 401
        embed.assert_not_called()
        assert fake_supabase.writes == []
    finally:
        app.dependency_overrides[get_current_user] = previous


def test_ingest_spec_requires_login(client, fake_supabase):
    from main import app
    from auth import get_current_user

    previous = app.dependency_overrides.pop(get_current_user)
    try:
        resp = client.post(f"/gadgets/{uuid4()}/specs", json={"raw_text": "Display: 6.2 inch"})
        assert resp.status_code == 401
        assert fake_supabase.writes == []
    finally:
        app.dependency_overrides[get_current_user] = previous


def test_ingest_spec_whitespace_only_text_returns_400(client, fake_supabase):
    gadget_id = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id}])
    resp = client.post(f"/gadgets/{gadget_id}/specs", json={"raw_text": "   "})
    assert resp.status_code == 400
    assert fake_supabase.writes == []