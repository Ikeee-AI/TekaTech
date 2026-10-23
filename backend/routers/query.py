import logging
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, HTTPException, Request
from openai import APITimeoutError, OpenAI, OpenAIError, RateLimitError
from pydantic import BaseModel, Field, field_validator

from auth import get_optional_user
from citations import strip_invalid_citations
from config import settings
from prompts import build_system_prompt
from rate_limit import limiter
from supabase_client import supabase
from tokens import count_chat_tokens

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])

# The SDK default is a 10-minute timeout with 2 retries, so a stalled provider would hold
# a request open far longer than a user will wait. One retry still absorbs a transient blip.
PROVIDER_TIMEOUT_SECONDS = 45
PROVIDER_MAX_RETRIES = 1
client = OpenAI(
    api_key=settings.openai_api_key,
    timeout=PROVIDER_TIMEOUT_SECONDS,
    max_retries=PROVIDER_MAX_RETRIES,
)

# Every AI-side failure is a 503 with a plain sentence in `detail`, the same shape the spec
# indexing endpoint uses, so the frontend shows the message without branching on the cause.
# Never put provider names, keys or quota details in these.
DETAIL_TIMEOUT = "The AI took too long to answer. Please try again."
DETAIL_UNAVAILABLE = "AI answers are temporarily unavailable. Spec browsing still works."
DETAIL_UNUSABLE = "The AI returned an answer we couldn't use. Please rephrase and try again."
NO_MATCHES_ANSWER = (
    "I couldn't find any spec information relevant to that question. "
    "Try adding more specs to the relevant gadgets first."
)

# Failure drill (README "Failure drill"). Disabled unless settings.failure_simulation_enabled,
# and then only an admin sending this header can use it. It never calls OpenAI, so a drill
# costs nothing, and it reuses the real error helpers below so the drill shows the real contract.
SIMULATION_HEADER = "x-simulate-failure"
SIMULATION_MODES = ("timeout", "quota", "bad_output", "empty")

MATCH_COUNT = 6
MATCH_THRESHOLD = 0.5

# Characters are a cheap O(1) first pass; tokens are what actually get billed and
# what the model's context is measured in. The char cap is deliberately loose so
# it only rejects the absurd, with the token cap as the real limit.
MAX_QUESTION_CHARS = 500
MAX_QUESTION_TOKENS = 160


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
    gadget_ids: Optional[list[UUID]] = None  # scope to specific gadgets (used by comparison mode)
    plain_language: bool = False

    @field_validator("question")
    @classmethod
    def question_within_token_budget(cls, value: str) -> str:
        tokens = count_chat_tokens(value)
        if tokens > MAX_QUESTION_TOKENS:
            raise ValueError(
                f"Question is {tokens} tokens; the limit is {MAX_QUESTION_TOKENS}. "
                "Try asking something more specific."
            )
        return value


class Source(BaseModel):
    gadget_id: UUID
    gadget_name: str
    content: str
    source_url: Optional[str] = None
    similarity: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source]
    model_used: str
    # [n] markers the model cited outside the snippets it was given; removed from `answer`.
    invalid_citations_removed: int = 0


def _token_count(response, field: str) -> int | None:
    """Pull one token count off an OpenAI response's usage block, if present.

    Returns None rather than raising when usage is absent or not an int — the
    count is telemetry, and must never be able to break a request that has
    already been paid for.
    """
    value = getattr(getattr(response, "usage", None), field, None)
    return value if isinstance(value, int) else None


def _provider_failure(exc: Exception) -> HTTPException:
    """Turn a provider exception into a safe 503; the details go to the log, not the user."""
    logger.warning("OpenAI call failed during /query: %s", type(exc).__name__, exc_info=True)
    detail = DETAIL_TIMEOUT if isinstance(exc, APITimeoutError) else DETAIL_UNAVAILABLE
    return HTTPException(status_code=503, detail=detail)


def _unusable_output(reason: str) -> HTTPException:
    logger.warning("Unusable OpenAI output during /query: %s", reason)
    return HTTPException(status_code=503, detail=DETAIL_UNUSABLE)


def _requested_simulation(request: Request) -> str | None:
    """The failure mode an admin asked for, or None for every normal request.

    Inert unless the setting is on AND the header is present; only then is the caller checked
    (so logged-in users pay no extra Supabase lookup on ordinary requests). A non-admin or
    anonymous caller is ignored silently, so the feature is invisible to them.
    """
    mode = request.headers.get(SIMULATION_HEADER)
    if not mode or not settings.failure_simulation_enabled:
        return None
    user = get_optional_user(request.headers.get("authorization"))
    if not user or not (user.app_metadata or {}).get("is_admin"):
        return None
    mode = mode.strip().lower()
    if mode not in SIMULATION_MODES:
        raise HTTPException(status_code=422, detail=f"Unknown simulation mode. Use one of: {', '.join(SIMULATION_MODES)}.")
    logger.warning("Failure simulation %r requested by admin %s", mode, getattr(user, "id", "?"))
    return mode


def _simulated_failure(mode: str) -> "QueryResponse":
    """Produce the response a real failure of this kind would, without calling OpenAI."""
    request = httpx.Request("POST", "https://simulated.invalid/v1")
    if mode == "empty":
        return QueryResponse(answer=NO_MATCHES_ANSWER, sources=[], model_used="none")
    if mode == "timeout":
        error = _provider_failure(APITimeoutError(request=request))
    elif mode == "quota":
        quota = RateLimitError("simulated", response=httpx.Response(429, request=request), body=None)
        error = _provider_failure(quota)
    else:  # bad_output
        error = _unusable_output("simulated")
    error.headers = {"X-Simulated-Failure": mode}
    raise error


def _record_query(*, question, answer, cited_gadget_ids, embedding_response, completion) -> None:
    """Best-effort write to query_history.

    Deliberately swallows failures: by the time this runs both OpenAI calls have
    already been billed, so losing the analytics row is strictly better than
    losing the user's answer to a logging problem.

    The token columns are optional — they only exist once
    sql/add_query_history_token_columns.sql has been applied — so a schema
    mismatch falls back to writing the row without them.
    """
    base_row = {
        "query_text": question,
        "answer_text": answer,
        "gadget_ids_ref": cited_gadget_ids,
        "model_used": "openai:gpt-5-mini",
    }
    token_row = {
        "embedding_tokens": _token_count(embedding_response, "total_tokens"),
        "prompt_tokens": _token_count(completion, "prompt_tokens"),
        "completion_tokens": _token_count(completion, "completion_tokens"),
    }

    try:
        supabase.table("query_history").insert({**base_row, **token_row}).execute()
        return
    except Exception:
        logger.warning(
            "query_history insert with token columns failed; retrying without them. "
            "Apply sql/add_query_history_token_columns.sql to enable token telemetry.",
            exc_info=True,
        )

    try:
        supabase.table("query_history").insert(base_row).execute()
    except Exception:
        logger.exception("query_history insert failed; continuing without logging this query")


@router.post("", response_model=QueryResponse)
@limiter.limit("10/minute")
def ask_question(request: Request, payload: QueryRequest):
    simulated = _requested_simulation(request)
    if simulated:
        return _simulated_failure(simulated)

    # 1. Embed the question the same way spec chunks were embedded
    try:
        embedding_response = client.embeddings.create(
            model="text-embedding-3-small", input=[payload.question]
        )
    except OpenAIError as exc:
        raise _provider_failure(exc) from None
    except ValueError as exc:
        # The SDK raises a bare ValueError when a 200 reply has no embedding data or isn't JSON.
        raise _unusable_output(f"embedding reply could not be read ({type(exc).__name__})") from None
    try:
        query_embedding = embedding_response.data[0].embedding
    except (AttributeError, IndexError, TypeError):
        raise _unusable_output("embedding response had no vector") from None

    # 2. Retrieve the most relevant spec chunks via the SQL function in schema.sql
    rpc_params = {
        "query_embedding": query_embedding,
        "match_count": MATCH_COUNT,
        "match_threshold": MATCH_THRESHOLD,
    }
    if payload.gadget_ids:
        rpc_params["match_gadget_ids"] = [str(i) for i in payload.gadget_ids]

    matches = supabase.rpc("match_spec_documents", rpc_params).execute().data

    if not matches:
        return QueryResponse(answer=NO_MATCHES_ANSWER, sources=[], model_used="none")

    # 3. Attach gadget names to each matched chunk (the SQL function only returns gadget_id).
    #    In comparison mode also look up the gadgets that were *asked* about, so one with no
    #    matching specs can still be named rather than silently vanishing from the answer.
    requested_ids = [str(i) for i in payload.gadget_ids] if payload.gadget_ids else []
    gadget_ids_in_matches = list({m["gadget_id"] for m in matches})
    gadgets = (
        supabase.table("gadgets")
        .select("id, name, brand")
        .in_("id", list({*gadget_ids_in_matches, *requested_ids}))
        .execute()
        .data
    )
    gadget_lookup = {g["id"]: g for g in gadgets}

    def _name_of(gadget_id: str) -> str:
        return gadget_lookup.get(gadget_id, {}).get("name", "Unknown gadget")

    # 4. Build the grounding context — numbered so the model can cite specific snippets.
    #    The gadget name on each line lets the model keep variants apart; the verified date
    #    is included when the retrieval function supplies one, so conflicting specs can be
    #    resolved by recency.
    context_lines = []
    for i, m in enumerate(matches, start=1):
        verified_at = m.get("verified_at")
        stamp = f", verified {str(verified_at)[:10]}" if verified_at else ""
        context_lines.append(f"[{i}] ({_name_of(m['gadget_id'])}{stamp}) {m['content']}")
    context = "\n\n".join(context_lines)

    # Comparison mode: state every gadget in scope. Retrieval only surfaces gadgets that
    # *have* specs, so without this the model can't tell the difference between "no specs
    # on file" and "not part of this comparison" — and would quietly compare a subset.
    scope_note = ""
    if requested_ids:
        matched_ids = {m["gadget_id"] for m in matches}
        undocumented = [_name_of(gid) for gid in requested_ids if gid not in matched_ids]
        scope_note = "\n\nGadgets in this comparison: " + ", ".join(_name_of(g) for g in requested_ids) + "."
        if undocumented:
            scope_note += (
                " No spec snippets were found for "
                + ", ".join(undocumented)
                + " — state that explicitly instead of leaving them out."
            )

    # The prompt text and its version live in prompts.py; its formatting rules are coupled to
    # AnswerText.jsx (see the note there).
    system_prompt = build_system_prompt(payload.plain_language)

    # 5. Generate the answer, grounded in only what was retrieved
    try:
        completion = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Spec snippets:\n{context}{scope_note}\n\nQuestion: {payload.question}",
                },
            ],
        )
    except OpenAIError as exc:
        raise _provider_failure(exc) from None
    except ValueError as exc:
        raise _unusable_output(f"completion reply could not be read ({type(exc).__name__})") from None
    try:
        answer = completion.choices[0].message.content
    except (AttributeError, IndexError, TypeError):
        raise _unusable_output("completion had no choices") from None
    if not answer or not answer.strip():
        raise _unusable_output("completion content was empty")

    # The model can cite a snippet number it was never given, which the UI would render as a
    # dead citation. Drop those markers (matches are numbered 1..len(matches)) and report how
    # many, so an evaluation can count them instead of seeing only the cleaned text.
    answer, invalid_citations_removed = strip_invalid_citations(answer, len(matches))
    if invalid_citations_removed:
        logger.warning("Removed %d out-of-range citation marker(s) from a /query answer", invalid_citations_removed)

    # 6. Log it — powers query_history / trending questions, plus token telemetry so the
    #    cost of a query is answerable after the fact rather than only via the OpenAI bill.
    cited_gadget_ids = list({m["gadget_id"] for m in matches})
    _record_query(
        question=payload.question,
        answer=answer,
        cited_gadget_ids=cited_gadget_ids,
        embedding_response=embedding_response,
        completion=completion,
    )

    sources = [
        Source(
            gadget_id=m["gadget_id"],
            gadget_name=gadget_lookup.get(m["gadget_id"], {}).get("name", "Unknown"),
            content=m["content"],
            source_url=m.get("source_url"),
            similarity=round(m["similarity"], 3),
        )
        for m in matches
    ]

    return QueryResponse(
        answer=answer,
        sources=sources,
        model_used="openai:gpt-5-mini",
        invalid_citations_removed=invalid_citations_removed,
    )