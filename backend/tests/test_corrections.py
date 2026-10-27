from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4


def test_submit_correction_spec_not_found(client, fake_supabase):
    fake_supabase.set_response("spec_documents", "select", [])
    resp = client.post(f"/specs/{uuid4()}/corrections", json={"suggested_content": "fixed text"})
    assert resp.status_code == 404


def test_submit_correction_success(client, fake_supabase):
    spec_id = str(uuid4())
    fake_supabase.set_response("spec_documents", "select", [{"id": spec_id}])
    fake_supabase.set_response(
        "spec_corrections",
        "insert",
        [{"id": str(uuid4()), "spec_document_id": spec_id, "suggested_content": "fixed", "status": "pending"}],
    )
    resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": "fixed"})
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"


def test_resolve_correction_not_found(client, fake_supabase):
    fake_supabase.set_response("spec_corrections", "select", [])
    resp = client.patch(f"/corrections/{uuid4()}", json={"action": "approve"})
    assert resp.status_code == 404


def test_resolve_correction_invalid_action(client, fake_supabase):
    correction_id = str(uuid4())
    fake_supabase.set_response(
        "spec_corrections",
        "select",
        [{"id": correction_id, "spec_document_id": str(uuid4()), "suggested_content": "x"}],
    )
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "maybe"})
    assert resp.status_code == 400


def test_resolve_correction_approve(client, fake_supabase):
    correction_id = str(uuid4())
    spec_id = str(uuid4())
    fake_supabase.set_response(
        "spec_corrections",
        "select",
        [{"id": correction_id, "spec_document_id": spec_id, "suggested_content": "corrected text"}],
    )
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "approve"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_resolve_correction_reject(client, fake_supabase):
    correction_id = str(uuid4())
    fake_supabase.set_response(
        "spec_corrections",
        "select",
        [{"id": correction_id, "spec_document_id": str(uuid4()), "suggested_content": "x"}],
    )
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "reject"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def _spec_updates(fake_supabase):
    return [data for table, op, data in fake_supabase.writes if table == "spec_documents" and op == "update"]


def test_approve_resets_spec_to_pending_and_clears_old_embedding(client, fake_supabase):
    """The old vector describes the old text: approve must not leave it marked indexed."""
    correction_id, spec_id = str(uuid4()), str(uuid4())
    fake_supabase.set_response(
        "spec_corrections", "select",
        [{"id": correction_id, "spec_document_id": spec_id, "suggested_content": "corrected text"}],
    )
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "approve"})
    assert resp.status_code == 200

    [update] = _spec_updates(fake_supabase)
    assert update["content"] == "corrected text"
    assert update["indexing_status"] == "pending"
    assert update["embedding"] is None
    assert update["verified_at"]
    assert ("spec_documents", "id", spec_id) in fake_supabase.filters


def test_reject_leaves_spec_untouched(client, fake_supabase):
    correction_id = str(uuid4())
    fake_supabase.set_response(
        "spec_corrections", "select",
        [{"id": correction_id, "spec_document_id": str(uuid4()), "suggested_content": "x"}],
    )
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "reject"})
    assert resp.status_code == 200
    assert _spec_updates(fake_supabase) == []


def test_index_after_approve_embeds_the_corrected_text(client, fake_supabase):
    """Approve then index: the index call must reach the provider with the new text,
    not return early because the row still says 'indexed'."""
    correction_id, spec_id, gadget_id = str(uuid4()), str(uuid4()), str(uuid4())
    fake_supabase.set_response(
        "spec_corrections", "select",
        [{"id": correction_id, "spec_document_id": spec_id, "suggested_content": "corrected text"}],
    )
    assert client.patch(f"/corrections/{correction_id}", json={"action": "approve"}).status_code == 200

    # The stored row is now whatever approve wrote.
    [approved] = _spec_updates(fake_supabase)
    fake_supabase.set_response(
        "spec_documents", "select",
        [{"id": spec_id, "content": approved["content"], "indexing_status": approved["indexing_status"]}],
    )
    fake_supabase.set_response("spec_documents", "update", [{"id": spec_id}])

    with patch("routers.specs.embed_texts", return_value=[[0.1] * 1536]) as embed:
        resp = client.post(f"/gadgets/{gadget_id}/specs/{spec_id}/index")

    assert resp.status_code == 200
    assert resp.json()["indexing_status"] == "indexed"
    embed.assert_called_once_with(["corrected text"])
    assert _spec_updates(fake_supabase)[-1]["indexing_status"] == "indexed"


def _override_non_admin(client_fixture_app):
    from auth import get_current_user

    non_admin = SimpleNamespace(id="non-admin", email="user@example.com", app_metadata={})
    client_fixture_app.dependency_overrides[get_current_user] = lambda: non_admin


def _restore_admin(client_fixture_app):
    from auth import get_current_user

    client_fixture_app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001", email="test@example.com", app_metadata={"is_admin": True}
    )


def test_resolve_correction_requires_admin(client, fake_supabase):
    from main import app

    correction_id = str(uuid4())
    _override_non_admin(app)
    try:
        resp = client.patch(f"/corrections/{correction_id}", json={"action": "approve"})
        assert resp.status_code == 403
    finally:
        _restore_admin(app)


def test_list_corrections_requires_admin(client, fake_supabase):
    from main import app

    _override_non_admin(app)
    try:
        resp = client.get("/corrections")
        assert resp.status_code == 403
    finally:
        _restore_admin(app)