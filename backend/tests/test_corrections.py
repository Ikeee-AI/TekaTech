from types import SimpleNamespace
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