"""Owner decision, 14 Nov 2026: visitors who are not signed in may only browse the catalog.

Every AI, comparison and question endpoint answers 401 to an anonymous caller (with the existing
"Login required" message) before it reads its body, touches the database or calls OpenAI. The
catalog reads stay public. The full who-may-call-what table is test_authorization_matrix.py.
"""
from unittest.mock import patch

import pytest

from conftest import signed_in_as

GADGET = "22222222-2222-2222-2222-222222222222"
OTHER = "33333333-3333-3333-3333-333333333333"

PROTECTED = [
    ("POST", "/query", {"question": "How big is the battery?", "gadget_ids": [GADGET]}),  # single gadget
    ("POST", "/query", {"question": "Which is better?", "gadget_ids": [GADGET, OTHER]}),  # comparison
    ("POST", "/query", {"question": "Which phone has the biggest battery?"}),  # catalog-wide
    ("POST", "/query", {"question": "What is 5G?", "allow_general_knowledge": True}),  # general knowledge
    ("POST", "/comparisons", {"gadget_ids": [GADGET, OTHER]}),
    ("GET", "/comparisons/abc1234", None),
    ("GET", "/stats/trending-questions", None),
    ("GET", "/me/ai-usage", None),
]


@pytest.mark.parametrize("method, path, body", PROTECTED, ids=lambda v: str(v)[:40])
def test_anonymous_caller_gets_401_and_nothing_happens(client, fake_supabase, method, path, body):
    fake_supabase.set_response("comparison_links", "select", [{"slug": "abc1234", "gadget_ids": [GADGET, OTHER]}])
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET}, {"id": OTHER}])
    with patch("routers.query.client") as openai_client, signed_in_as(None):
        resp = client.request(method, path, json=body)
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Login required"}
    assert fake_supabase.writes == []
    assert fake_supabase.rpc_calls == []
    assert not openai_client.method_calls


def test_a_shared_link_opens_for_a_signed_in_user(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [{"slug": "abc1234", "gadget_ids": [GADGET, OTHER]}])
    resp = client.get("/comparisons/abc1234")
    assert resp.status_code == 200
    assert resp.json() == {"slug": "abc1234", "gadget_ids": [GADGET, OTHER]}


def test_trending_questions_are_not_stored_by_shared_caches(client, fake_supabase):
    resp = client.get("/stats/trending-questions")
    assert resp.status_code == 200
    assert resp.headers["Cache-Control"].startswith("private")


@pytest.mark.parametrize(
    "path", ["/gadgets", f"/gadgets/{GADGET}", f"/gadgets/{GADGET}/specs", "/stats/spec-coverage", "/health", "/version"]
)
def test_catalog_browsing_stays_public(client, fake_supabase, path):
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "Phone X", "brand": "Brand", "category": "phone"}])
    with signed_in_as(None):
        resp = client.get(path)
    assert resp.status_code not in (401, 403), path
