from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest


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


def _pending(correction_id, spec_id=None, content="x", status="pending"):
    return {
        "id": correction_id,
        "spec_document_id": spec_id or str(uuid4()),
        "suggested_content": content,
        "status": status,
    }


def test_resolve_correction_approve(client, fake_supabase):
    correction_id = str(uuid4())
    spec_id = str(uuid4())
    row = _pending(correction_id, spec_id, "corrected text")
    fake_supabase.set_response("spec_corrections", "select", [row])
    fake_supabase.set_response("spec_corrections", "update", [{**row, "status": "approved"}])
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "approve"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    # The status guard is part of the UPDATE itself, not only the earlier read.
    assert ("spec_corrections", "status", "pending") in fake_supabase.filters
    review = next(p for t, op, p in fake_supabase.writes if t == "spec_corrections" and op == "update")
    assert review["status"] == "approved"
    # Timezone-aware UTC timestamp (datetime.now(timezone.utc), not utcnow()).
    assert review["reviewed_at"].endswith("+00:00")
    spec_update = next(p for t, op, p in fake_supabase.writes if t == "spec_documents" and op == "update")
    assert spec_update["content"] == "corrected text"
    assert ("spec_documents", "id", spec_id) in fake_supabase.filters


def test_resolve_correction_reject(client, fake_supabase):
    correction_id = str(uuid4())
    row = _pending(correction_id)
    fake_supabase.set_response("spec_corrections", "select", [row])
    fake_supabase.set_response("spec_corrections", "update", [{**row, "status": "rejected"}])
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "reject"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"
    # Rejecting never touches the spec text.
    assert not [w for w in fake_supabase.writes if w[0] == "spec_documents"]


@pytest.mark.parametrize("already", ["approved", "rejected"])
@pytest.mark.parametrize("action", ["approve", "reject"])
def test_resolve_already_resolved_correction_is_409(client, fake_supabase, already, action):
    correction_id = str(uuid4())
    fake_supabase.set_response("spec_corrections", "select", [_pending(correction_id, status=already)])
    resp = client.patch(f"/corrections/{correction_id}", json={"action": action})
    assert resp.status_code == 409
    assert resp.json()["detail"] == f"Correction was already {already}"
    # Nothing is written: neither the review nor the spec text.
    assert fake_supabase.writes == []


def test_resolve_correction_lost_race_is_409_and_spec_untouched(client, fake_supabase, monkeypatch):
    """Two admins approve at once: both reads see 'pending', but only one conditional
    UPDATE matches. The loser gets 409 and must not overwrite the spec text."""
    correction_id = str(uuid4())
    reads = iter([[_pending(correction_id)], [_pending(correction_id, status="approved")]])

    import conftest

    real_execute = conftest.FakeQuery.execute

    def execute(self):
        if self._table == "spec_corrections" and self._operation == "select":
            fake_supabase.set_response("spec_corrections", "select", next(reads))
        return real_execute(self)

    monkeypatch.setattr(conftest.FakeQuery, "execute", execute)
    fake_supabase.set_response("spec_corrections", "update", [])  # the other admin won

    resp = client.patch(f"/corrections/{correction_id}", json={"action": "approve"})
    assert resp.status_code == 409
    assert resp.json()["detail"] == "Correction was already approved"
    assert not [w for w in fake_supabase.writes if w[0] == "spec_documents"]


def test_resolve_correction_update_matching_nothing_while_pending_is_503(client, fake_supabase):
    correction_id = str(uuid4())
    fake_supabase.set_response("spec_corrections", "select", [_pending(correction_id)])
    fake_supabase.set_response("spec_corrections", "update", [])
    resp = client.patch(f"/corrections/{correction_id}", json={"action": "approve"})
    assert resp.status_code == 503
    assert not [w for w in fake_supabase.writes if w[0] == "spec_documents"]


# --- POST /specs/{id}/corrections input limits ------------------------------


def _spec_exists(fake_supabase, spec_id):
    fake_supabase.set_response("spec_documents", "select", [{"id": spec_id}])
    fake_supabase.set_response(
        "spec_corrections", "insert", [{"id": str(uuid4()), "spec_document_id": spec_id, "status": "pending"}]
    )


@pytest.mark.parametrize("text", ["", "   ", "\n\t "])
def test_submit_correction_rejects_blank_text(client, fake_supabase, text):
    spec_id = str(uuid4())
    _spec_exists(fake_supabase, spec_id)
    resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": text})
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["msg"] == "Write the corrected spec text."
    assert fake_supabase.writes == []


def test_submit_correction_stores_stripped_text(client, fake_supabase):
    spec_id = str(uuid4())
    _spec_exists(fake_supabase, spec_id)
    resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": "  Battery: 5000 mAh \n"})
    assert resp.status_code == 201
    assert fake_supabase.writes[-1][2]["suggested_content"] == "Battery: 5000 mAh"


def test_submit_correction_rejects_over_char_limit(client, fake_supabase):
    from routers.corrections import MAX_CORRECTION_CHARS

    spec_id = str(uuid4())
    _spec_exists(fake_supabase, spec_id)
    resp = client.post(
        f"/specs/{spec_id}/corrections", json={"suggested_content": "a " * (MAX_CORRECTION_CHARS // 2 + 1)}
    )
    assert resp.status_code == 422
    assert "the limit is 20000" in resp.json()["detail"][0]["msg"]
    assert fake_supabase.writes == []


def test_submit_correction_at_char_limit_is_accepted(client, fake_supabase):
    from routers.corrections import MAX_CORRECTION_CHARS, MAX_CORRECTION_TOKENS
    from tokens import count_embedding_tokens

    text = "battery " * (MAX_CORRECTION_CHARS // 8)
    text = text[:MAX_CORRECTION_CHARS]
    assert count_embedding_tokens(text) <= MAX_CORRECTION_TOKENS  # repeated words tokenize cheaply
    spec_id = str(uuid4())
    _spec_exists(fake_supabase, spec_id)
    resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": text})
    assert resp.status_code == 201


def test_submit_correction_rejects_over_token_limit(client, fake_supabase):
    """Under the char cap but over the embedding-token cap (the same 6000 that
    index_spec enforces), so an approved correction can always be indexed."""
    from routers.corrections import MAX_CORRECTION_CHARS, MAX_CORRECTION_TOKENS
    from tokens import count_embedding_tokens

    text = "".join(chr(0x4E00 + (i * 37) % 2000) for i in range(MAX_CORRECTION_CHARS - 10))
    assert len(text) <= MAX_CORRECTION_CHARS
    assert count_embedding_tokens(text) > MAX_CORRECTION_TOKENS
    spec_id = str(uuid4())
    _spec_exists(fake_supabase, spec_id)
    resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": text})
    assert resp.status_code == 422
    assert f"the limit is {MAX_CORRECTION_TOKENS}" in resp.json()["detail"][0]["msg"]
    assert fake_supabase.writes == []


def test_correction_token_cap_matches_index_limit():
    from routers.corrections import MAX_CORRECTION_TOKENS
    from routers.specs import MAX_RAW_TEXT_TOKENS

    assert MAX_CORRECTION_TOKENS <= MAX_RAW_TEXT_TOKENS


def test_submit_correction_rate_limited_after_20_per_hour(client, fake_supabase):
    spec_id = str(uuid4())
    _spec_exists(fake_supabase, spec_id)
    for _ in range(20):
        resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": "fixed"})
        assert resp.status_code == 201
    resp = client.post(f"/specs/{spec_id}/corrections", json={"suggested_content": "fixed"})
    assert resp.status_code == 429


def test_submit_correction_requires_login(client, fake_supabase):
    from main import app

    _as_anonymous(app)
    try:
        resp = client.post(f"/specs/{uuid4()}/corrections", json={"suggested_content": "fixed"})
        assert resp.status_code == 401
        assert fake_supabase.writes == []
    finally:
        _restore_admin(app)


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

# --- badge routes when the database call fails -----------------------------


def _broken_table(name):
    raise ConnectionError("Server disconnected")


def test_my_corrections_db_failure_is_503(client, fake_supabase, monkeypatch):
    monkeypatch.setattr(fake_supabase, "table", _broken_table)

    resp = client.get("/corrections/mine")

    assert resp.status_code == 503
    assert resp.json()["detail"] == "Couldn't load your suggestions right now."


def test_pending_count_db_failure_is_503(client, fake_supabase, monkeypatch):
    monkeypatch.setattr(fake_supabase, "table", _broken_table)

    resp = client.get("/corrections/pending-count")

    assert resp.status_code == 503
    assert resp.json()["detail"] == "Couldn't count pending corrections right now."
