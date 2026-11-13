"""Signed-in GET routes call Supabase Auth on every request, so each has a per-client limit
(120/minute) that a normal session never reaches but a loop does."""
import pytest

GADGET = "22222222-2222-2222-2222-222222222222"
LIMIT = 120


@pytest.mark.parametrize(
    "path, table",
    [
        ("/corrections/mine", "spec_corrections"),
        ("/me/gadgets", "user_gadgets"),
        (f"/me/gadgets/{GADGET}/questions", "user_questions"),
    ],
)
def test_authed_get_is_limited_to_120_per_minute(client, fake_supabase, path, table):
    fake_supabase.set_response(table, "select", [])
    for _ in range(LIMIT):
        assert client.get(path).status_code == 200
    assert client.get(path).status_code == 429
