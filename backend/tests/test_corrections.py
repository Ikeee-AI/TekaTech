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


# --- GET /corrections/mine (issue #109) ---------------------------------

NON_ADMIN_ID = "00000000-0000-0000-0000-0000000000aa"
OTHER_USER_ID = "00000000-0000-0000-0000-0000000000bb"


def _my_row(submitted_by, status="pending", created_at="2026-10-20T10:00:00+00:00", reviewed_at=None, content="Battery: 4000 mAh"):
    return {
        "id": str(uuid4()),
        "spec_document_id": str(uuid4()),
        "submitted_by": submitted_by,
        "suggested_content": "Battery: 5000 mAh",
        "status": status,
        "created_at": created_at,
        "reviewed_at": reviewed_at,
        "reviewed_by": "admin-should-not-leak",
        "spec_documents": {
            "content": content,
            "gadget_id": "g-1",
            "gadgets": {"id": "g-1", "name": "Pixel 9", "brand": "Google"},
        },
    }


def _as_user(app, user_id=NON_ADMIN_ID):
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=user_id, email="user@example.com", app_metadata={}
    )


def _as_anonymous(app):
    # Drop the conftest override so the real get_current_user runs.
    from auth import get_current_user

    app.dependency_overrides.pop(get_current_user, None)


def test_my_corrections_returns_only_callers_rows(client, fake_supabase):
    from main import app

    mine_pending = _my_row(NON_ADMIN_ID, created_at="2026-10-22T10:00:00+00:00")
    mine_approved = _my_row(
        NON_ADMIN_ID, status="approved", created_at="2026-10-21T10:00:00+00:00", reviewed_at="2026-10-23T09:00:00+00:00"
    )
    someone_else = _my_row(OTHER_USER_ID, status="rejected", reviewed_at="2026-10-23T09:00:00+00:00")
    fake_supabase.set_response("spec_corrections", "select", [mine_pending, someone_else, mine_approved])

    _as_user(app)
    try:
        # A client-supplied user id must be ignored: the route only uses the session.
        resp = client.get(f"/corrections/mine?submitted_by={OTHER_USER_ID}")
    finally:
        _restore_admin(app)

    assert resp.status_code == 200
    body = resp.json()
    assert [item["id"] for item in body] == [mine_pending["id"], mine_approved["id"]]
    # The database query itself is scoped to the caller, not just the response.
    assert ("spec_corrections", "submitted_by", NON_ADMIN_ID) in fake_supabase.filters
    assert ("spec_corrections", "submitted_by", OTHER_USER_ID) not in fake_supabase.filters

    approved = body[1]
    assert approved["status"] == "approved"
    assert approved["reviewed_at"] == "2026-10-23T09:00:00+00:00"
    assert approved["suggested_content"] == "Battery: 5000 mAh"
    assert approved["spec_excerpt"] == "Battery: 4000 mAh"
    assert approved["gadget"] == {"id": "g-1", "name": "Pixel 9", "brand": "Google"}
    assert "reviewed_by" not in approved
    assert "submitted_by" not in approved


def test_my_corrections_newest_first_and_bounded(client, fake_supabase):
    from routers.corrections import MY_CORRECTIONS_LIMIT

    rows = [_my_row("00000000-0000-0000-0000-000000000001") for _ in range(MY_CORRECTIONS_LIMIT + 5)]
    fake_supabase.set_response("spec_corrections", "select", rows)

    resp = client.get("/corrections/mine")

    assert resp.status_code == 200
    assert len(resp.json()) == MY_CORRECTIONS_LIMIT
    assert ("spec_corrections", "created_at", {"desc": True}) in fake_supabase.orders
    assert ("spec_corrections", MY_CORRECTIONS_LIMIT) in fake_supabase.limits


def test_my_corrections_empty_list(client, fake_supabase):
    fake_supabase.set_response("spec_corrections", "select", [])
    resp = client.get("/corrections/mine")
    assert resp.status_code == 200
    assert resp.json() == []


def test_my_corrections_long_spec_is_excerpted(client, fake_supabase):
    from routers.corrections import SPEC_EXCERPT_CHARS

    row = _my_row("00000000-0000-0000-0000-000000000001", content="x" * (SPEC_EXCERPT_CHARS + 100))
    fake_supabase.set_response("spec_corrections", "select", [row])

    resp = client.get("/corrections/mine")

    excerpt = resp.json()[0]["spec_excerpt"]
    assert len(excerpt) == SPEC_EXCERPT_CHARS + 1
    assert excerpt.endswith("…")


def test_my_corrections_missing_spec_join_is_null_gadget(client, fake_supabase):
    row = _my_row("00000000-0000-0000-0000-000000000001")
    row["spec_documents"] = None
    fake_supabase.set_response("spec_corrections", "select", [row])

    resp = client.get("/corrections/mine")

    assert resp.status_code == 200
    assert resp.json()[0]["gadget"] is None
    assert resp.json()[0]["spec_excerpt"] == ""


def test_my_corrections_requires_login(client, fake_supabase):
    from main import app

    _as_anonymous(app)
    try:
        resp = client.get("/corrections/mine")
        assert resp.status_code == 401
    finally:
        _restore_admin(app)


def test_my_corrections_malformed_auth_header_is_401(client, fake_supabase):
    from main import app

    _as_anonymous(app)
    try:
        resp = client.get("/corrections/mine", headers={"Authorization": "Token not-a-bearer"})
        assert resp.status_code == 401
    finally:
        _restore_admin(app)


# --- GET /corrections/pending-count ---------------------------------------


def test_pending_count_returns_number(client, fake_supabase):
    fake_supabase.set_response("spec_corrections", "select", [{"id": str(uuid4())} for _ in range(3)])

    resp = client.get("/corrections/pending-count")

    assert resp.status_code == 200
    assert resp.json() == {"count": 3}
    assert ("spec_corrections", "status", "pending") in fake_supabase.filters
    # Counted in the database: no queue rows are requested.
    assert ("spec_corrections", 0) in fake_supabase.limits


def test_pending_count_zero(client, fake_supabase):
    fake_supabase.set_response("spec_corrections", "select", [])
    resp = client.get("/corrections/pending-count")
    assert resp.status_code == 200
    assert resp.json() == {"count": 0}


def test_pending_count_requires_admin(client, fake_supabase):
    from main import app

    _as_user(app)
    try:
        resp = client.get("/corrections/pending-count")
        assert resp.status_code == 403
    finally:
        _restore_admin(app)


def test_pending_count_requires_login(client, fake_supabase):
    from main import app

    _as_anonymous(app)
    try:
        resp = client.get("/corrections/pending-count")
        assert resp.status_code == 401
    finally:
        _restore_admin(app)