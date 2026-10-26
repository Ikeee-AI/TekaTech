from types import SimpleNamespace
from unittest.mock import patch

from tokens import CHAT_ENCODING, EMBEDDING_ENCODING, count_chat_tokens, count_embedding_tokens


def test_models_use_different_encodings():
    """gpt-5-mini and text-embedding-3-small do not share an encoding, so counting
    with the wrong one silently misreports size."""
    assert EMBEDDING_ENCODING.name == "cl100k_base"
    assert CHAT_ENCODING.name == "o200k_base"


# Written as escapes rather than literal glyphs so the file stays readable in any
# console encoding. This is ordinary Japanese text.
JAPANESE = (
    "このノートパソコンは非常に"
    "美しいディスプレイを搭載し"
    "ています画面表示"
)
KANA_PAIR = "この"
# A rare CJK character that o200k_base splits into two tokens.
TWO_TOKEN_CHAR = "龘"


def test_chars_are_a_poor_proxy_for_tokens():
    """The premise behind having token caps at all: a character budget buys wildly
    different amounts of billable tokens depending on the script."""
    latin = "Display: 7-inch FHD 120Hz panel with 500 nits of brightness okay"
    latin_chars_per_token = len(latin) / count_chat_tokens(latin)
    japanese_chars_per_token = len(JAPANESE) / count_chat_tokens(JAPANESE)
    # ~3.4 vs ~1.5 — the same char cap permits roughly twice the token spend.
    assert latin_chars_per_token > japanese_chars_per_token * 2


def test_question_over_token_budget_is_rejected(client, fake_supabase):
    """A question can sit under the char cap while blowing the token budget."""
    question = TWO_TOKEN_CHAR * 100  # 100 chars, under MAX_QUESTION_CHARS (150)
    assert len(question) < 150
    assert count_chat_tokens(question) > 160  # over MAX_QUESTION_TOKENS
    resp = client.post("/query", json={"question": question})
    assert resp.status_code == 422
    assert "tokens" in resp.text


def test_spec_text_over_token_budget_is_rejected(client, fake_supabase):
    """Same gap on the ingestion path, where the cost is larger."""
    from uuid import uuid4

    raw_text = KANA_PAIR * 7000  # 14k chars, under the 20k char cap
    assert len(raw_text) < 20_000
    assert count_embedding_tokens(raw_text) > 6_000  # over MAX_RAW_TEXT_TOKENS
    resp = client.post(f"/gadgets/{uuid4()}/specs", json={"raw_text": raw_text})
    assert resp.status_code == 422
    assert "tokens" in resp.text


def _usage_completion(prompt=120, completion=45):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="An answer [1]."))],
        usage=SimpleNamespace(prompt_tokens=prompt, completion_tokens=completion, total_tokens=prompt + completion),
    )


def _usage_embedding(total=18):
    return SimpleNamespace(
        data=[SimpleNamespace(embedding=[0.0] * 1536)],
        usage=SimpleNamespace(prompt_tokens=total, total_tokens=total),
    )


def _query_once(client, fake_supabase):
    gadget_id = "11111111-1111-1111-1111-111111111111"
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": gadget_id, "content": "8-core CPU", "source_url": None, "similarity": 0.8}]
    )
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id, "name": "Gadget", "brand": "B"}])
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = _usage_embedding()
        mock_client.chat.completions.create.return_value = _usage_completion()
        return client.post("/query", json={"question": "How many cores?"})


def test_token_usage_is_recorded(client, fake_supabase):
    """Token counts come back free on every OpenAI response; they should land in
    query_history so spend is answerable after the fact."""
    inserted = {}

    original_table = fake_supabase.table

    def capture(name):
        builder = original_table(name)
        if name == "query_history":
            real_insert = builder.insert

            def spy(row, *a, **k):
                inserted.update(row)
                return real_insert(row, *a, **k)

            builder.insert = spy
        return builder

    with patch.object(fake_supabase, "table", side_effect=capture):
        resp = _query_once(client, fake_supabase)

    assert resp.status_code == 200
    assert inserted["embedding_tokens"] == 18
    assert inserted["prompt_tokens"] == 120
    assert inserted["completion_tokens"] == 45


def test_query_still_succeeds_when_token_columns_are_missing(client, fake_supabase):
    """The token columns only exist after the migration is applied. Until then the
    insert must fall back to the base row rather than 500 a request whose OpenAI
    calls have already been billed."""
    attempts = []
    original_table = fake_supabase.table

    def capture(name):
        builder = original_table(name)
        if name == "query_history":
            def failing_insert(row, *a, **k):
                attempts.append(row)
                if "prompt_tokens" in row:
                    raise Exception("column query_history.prompt_tokens does not exist")
                return builder

            builder.insert = failing_insert
        return builder

    with patch.object(fake_supabase, "table", side_effect=capture):
        resp = _query_once(client, fake_supabase)

    assert resp.status_code == 200
    assert len(attempts) == 2  # tried with tokens, retried without
    assert "prompt_tokens" not in attempts[1]


def test_query_survives_history_logging_failure_entirely(client, fake_supabase):
    """Analytics must never cost the user an answer that was already paid for."""
    original_table = fake_supabase.table

    def capture(name):
        builder = original_table(name)
        if name == "query_history":
            def always_fails(row, *a, **k):
                raise Exception("query_history is unreachable")

            builder.insert = always_fails
        return builder

    with patch.object(fake_supabase, "table", side_effect=capture):
        resp = _query_once(client, fake_supabase)

    assert resp.status_code == 200
    assert resp.json()["answer"] == "An answer [1]."
