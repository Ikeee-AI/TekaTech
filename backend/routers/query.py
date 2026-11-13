import logging
from typing import Literal, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, HTTPException, Request
from openai import APITimeoutError, OpenAI, OpenAIError, RateLimitError
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

import answer_cache
from auth import get_optional_user
from citations import strip_invalid_citations
from config import settings
from keyword_search import build_keyword_query
from prompts import GK_PROMPT_VERSION, PROMPT_VERSION, build_general_knowledge_prompt, build_system_prompt
from rate_limit import limiter
from routers.comparisons import MAX_COMPARISON_GADGETS
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
# Retrieval or the gadget-name lookup failed (database side). Same 503 shape, so the frontend
# treats it like any other "unavailable" answer instead of a raw 500.
DETAIL_LOOKUP_FAILED = "We couldn't look up specs to answer that right now. Please try again shortly."
NO_MATCHES_ANSWER = (
    "I couldn't find any spec information relevant to that question. "
    "Try adding more specs to the relevant gadgets first."
)

# Failure drill (README "Failure drill"). Disabled unless settings.failure_simulation_enabled,
# and then only an admin sending this header can use it. It never calls OpenAI, so a drill
# costs nothing, and it reuses the real error helpers below so the drill shows the real contract.
SIMULATION_HEADER = "x-simulate-failure"
SIMULATION_MODES = ("timeout", "quota", "bad_output", "empty")

# Admin-only evaluation aid: skip the answer-cache READ for this request (the fresh answer is still
# stored). Ignored for anonymous and non-admin callers, like the failure drill header.
CACHE_BYPASS_HEADER = "x-bypass-answer-cache"
CACHE_BYPASS_VALUES = ("1", "true", "yes")

MATCH_COUNT = 6
# Cosine similarity floor for match_spec_documents, chosen from measurements on the verified eval
# pack (docs/evidence/retrieval-threshold-2026-10-27.md, issue #88). text-embedding-3-small scores
# are low in absolute terms: relevant query/chunk pairs measured 0.26-0.64 (median 0.47), while
# off-topic questions peaked at 0.22. The old 0.5 kept only 13 of 39 relevant pairs (13 of 23
# answerable questions found their evidence); 0.25 keeps all 39 and still returns nothing for the
# off-topic questions. MATCH_COUNT, not the threshold, bounds how much context reaches the prompt.
MATCH_THRESHOLD = 0.25
# Cosine similarity is never below -1, so this keeps every chunk in scope and lets the ranking decide (#88).
SCOPED_MATCH_THRESHOLD = -1.0
# Keyword fallback (keyword_search.py, sql/keyword_match_spec_documents.sql): only when the
# vector search returned nothing. Fewer chunks than MATCH_COUNT, since word matches are coarser.
KEYWORD_MATCH_COUNT = 4

EMBEDDING_MODEL = "text-embedding-3-small"
ANSWER_MODEL = "gpt-5-mini"
MODEL_USED = f"openai:{ANSWER_MODEL}"

# gpt-5-mini bills hidden reasoning tokens as output ($2.00 per 1M against $0.25 per 1M for input),
# and /query is public with a shared prepaid balance, so a question's cost is set by how long the
# model thinks and writes. Measured on #77: about 87% of an uncapped answer's output was reasoning.
# The cap is a ceiling, not a target: it sits well above a normal grounded answer, and reasoning
# counts toward it, so lowering it much further risks cutting answers off before they start.
ANSWER_MAX_COMPLETION_TOKENS = 1500
ANSWER_REASONING_EFFORT = "low"

# Two caps, checked in this order. Characters are the product limit users see (the frontend
# counts to the same number) and a cheap O(1) check. Tokens are what actually get billed and
# what the model's context is measured in; 150 characters of ordinary text stays well under
# 160 tokens, but some scripts and emoji cost 2-3 tokens per character, so the token cap stays
# as the second guard.
MAX_QUESTION_CHARS = 150
MAX_QUESTION_TOKENS = 160


class QueryRequest(BaseModel):
    question: str
    # Scope to specific gadgets (comparison mode). Omit it, or send null, to search all
    # gadgets. Capped like a saved comparison: every id is named in the prompt's
    # "Gadgets in this comparison" note, so an uncapped list on this public route would be
    # an uncapped prompt. The cap applies to the list as sent, before duplicates are removed.
    gadget_ids: Optional[list[UUID]] = Field(default=None, max_length=MAX_COMPARISON_GADGETS)
    plain_language: bool = False
    # Optional general-knowledge answer (#172). Only used when retrieval finds no spec chunks;
    # a question that matches specs always gets the grounded, cited answer.
    allow_general_knowledge: bool = False
    # The gadget chat's Regenerate (user_questions.sql): the new answer replaces the caller's
    # newest saved turn for this same question and gadget instead of adding a second one.
    # Ignored when nothing is saved (anonymous, or not exactly one gadget).
    regenerate: bool = False

    @field_validator("question")
    @classmethod
    def question_within_limits(cls, value: str) -> str:
        # PydanticCustomError, not ValueError, so the 422 `msg` is the plain sentence the
        # frontend shows, without pydantic's "Value error, " prefix.
        # Stripped first: a whitespace-only question would otherwise pay for an embedding.
        value = value.strip()
        if not value:
            raise PydanticCustomError("question_empty", "Question is empty. Type a question first.")
        if len(value) > MAX_QUESTION_CHARS:
            raise PydanticCustomError(
                "question_too_long",
                "Question is too long: {chars} characters; the limit is {limit}.",
                {"chars": len(value), "limit": MAX_QUESTION_CHARS},
            )
        tokens = count_chat_tokens(value)
        if tokens > MAX_QUESTION_TOKENS:
            raise PydanticCustomError(
                "question_too_many_tokens",
                "Question is {tokens} tokens; the limit is {limit}. Try asking something more specific.",
                {"tokens": tokens, "limit": MAX_QUESTION_TOKENS},
            )
        return value

    @field_validator("gadget_ids")
    @classmethod
    def gadget_ids_not_empty_and_unique(cls, value: Optional[list[UUID]]) -> Optional[list[UUID]]:
        if value is None:
            return None
        # An empty list is rejected rather than read as "all gadgets", so a comparison whose
        # selection was lost never silently turns into a global search.
        if not value:
            raise PydanticCustomError(
                "gadget_ids_empty", "gadget_ids must name at least one gadget; omit it to search all gadgets."
            )
        return list(dict.fromkeys(value))  # drop duplicates, keep the order sent


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
    # True when the answer was reused from answer_cache instead of generated for this request.
    cached: bool = False
    # How it matched: the same normalized question, or a very similar question embedding.
    cache_match: Optional[Literal["exact", "similar"]] = None
    # How the sources were found: vector similarity, the keyword fallback (only tried when the
    # vector search found nothing), or neither (no sources; the "no relevant specs" answer).
    retrieval: Literal["vector", "keyword", "none"] = "none"
    # What the answer rests on: saved specs (cited), the model's general knowledge (unverified,
    # uncited, only when the request allowed it), or nothing (the "no relevant specs" reply).
    answer_basis: Literal["specs", "general_knowledge", "none"] = "none"


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


def _lookup_failure(step: str, exc: Exception) -> HTTPException:
    """A database step failed after the embedding was billed: a safe 503, details to the log."""
    logger.warning("Database step %r failed during /query: %s", step, type(exc).__name__, exc_info=True)
    return HTTPException(status_code=503, detail=DETAIL_LOOKUP_FAILED)


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


def _admin_bypasses_cache(request: Request) -> bool:
    """True only when an admin sends X-Bypass-Answer-Cache: 1, so an evaluation run measures fresh answers.

    Same gating as the failure drill: the caller is looked up only when the header is present, and a
    non-admin or anonymous caller is ignored silently. Unlike the drill it needs no setting, because
    it changes no response contract: the request runs the full pipeline it would run on a cache miss.
    """
    value = request.headers.get(CACHE_BYPASS_HEADER)
    if not value or value.strip().lower() not in CACHE_BYPASS_VALUES:
        return False
    user = get_optional_user(request.headers.get("authorization"))
    if not user or not (user.app_metadata or {}).get("is_admin"):
        return False
    logger.info("Answer-cache read bypassed by admin %s", getattr(user, "id", "?"))
    return True


# Logged once per process: until sql/keyword_match_spec_documents.sql is applied, every
# no-match question would otherwise repeat the same warning.
_keyword_rpc_failure_logged = False


def _keyword_matches(question: str, query_embedding, gadget_ids) -> list[dict]:
    """The keyword fallback's chunks, or [] when it finds nothing or cannot run.

    Never raises: the RPC is applied to production by hand, so a missing function (or any other
    database error here) must leave the answer exactly as it was before the fallback existed,
    the "no relevant specs" 200, not a 503.
    """
    global _keyword_rpc_failure_logged
    keywords = build_keyword_query(question)
    if not keywords:
        return []
    params = {
        "query_embedding": query_embedding,
        "search_query": keywords.search_query,
        "unit_patterns": keywords.unit_patterns,
        "match_count": KEYWORD_MATCH_COUNT,
    }
    if gadget_ids:
        params["match_gadget_ids"] = [str(i) for i in gadget_ids]
    try:
        return supabase.rpc("keyword_match_spec_documents", params).execute().data or []
    except Exception as exc:
        if not _keyword_rpc_failure_logged:
            _keyword_rpc_failure_logged = True
            logger.warning(
                "Keyword fallback unavailable (%s); answering without it. Apply "
                "sql/keyword_match_spec_documents.sql to enable it. Further failures log at debug level.",
                type(exc).__name__, exc_info=True,
            )
        else:
            logger.debug("Keyword fallback unavailable (%s)", type(exc).__name__)
        return []


# query_history.query_text feeds the public /stats/trending-questions list. A signed-in user's
# single-gadget question is saved privately in user_questions instead, so its row here keeps
# only these placeholders: the token columns are still the only per-query cost record (no other
# table holds embedding/prompt/completion counts), so skipping the row would lose cost accounting,
# while the placeholder keeps the question and its answer out of anything public. The trending
# list also ignores the placeholder (routers/stats.py).
PRIVATE_QUESTION_PLACEHOLDER = "[private question]"
PRIVATE_ANSWER_PLACEHOLDER = "[private answer]"


def _record_query(
    *, question, answer, cited_gadget_ids, embedding_tokens, prompt_tokens, completion_tokens, private=False
) -> None:
    """Best-effort write to query_history.

    private=True (a signed-in user's saved single-gadget question) stores the placeholders above
    instead of the question and answer text, keeping the token accounting.

    Deliberately swallows failures: by the time this runs the OpenAI calls for
    this answer have already been billed, so losing the analytics row is
    strictly better than losing the user's answer to a logging problem.

    A cached answer is recorded too, so trending questions keep counting it,
    with 0 for each OpenAI call it skipped (an exact hit skips both).

    The token columns are optional — they only exist once
    sql/add_query_history_token_columns.sql has been applied — so a schema
    mismatch falls back to writing the row without them.
    """
    base_row = {
        "query_text": PRIVATE_QUESTION_PLACEHOLDER if private else question,
        "answer_text": PRIVATE_ANSWER_PLACEHOLDER if private else answer,
        "gadget_ids_ref": cited_gadget_ids,
        "model_used": MODEL_USED,
    }
    token_row = {
        "embedding_tokens": embedding_tokens,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
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


def _serve_cached(
    question: str, cached: answer_cache.CachedAnswer, match: str, *, embedding_tokens, private=False
) -> QueryResponse:
    """Return a cached answer as this request's answer, and record it like a fresh one.

    The "no relevant specs" answer is not recorded, the same as when it is generated.
    """
    response = QueryResponse(**cached.response, cached=True, cache_match=match)
    if cached.grounded:
        _record_query(
            question=question,
            answer=response.answer,
            cited_gadget_ids=list({s["gadget_id"] for s in cached.response["sources"]}),
            embedding_tokens=embedding_tokens,
            prompt_tokens=0,
            completion_tokens=0,
            private=private,
        )
    return response


def _cacheable(response: QueryResponse, *, grounded: bool) -> answer_cache.CachedAnswer:
    return answer_cache.CachedAnswer(
        response=response.model_dump(mode="json", exclude={"cached", "cache_match"}),
        grounded=grounded,
    )


def _generate_answer(system_prompt: str, user_content: str):
    """One capped chat call; returns (answer text, completion). Every failure is a safe 503.

    Shared by the grounded answer and the general-knowledge answer, so both get the same cap,
    reasoning effort and handling of cut-off or empty output.
    """
    try:
        completion = client.chat.completions.create(
            model=ANSWER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            max_completion_tokens=ANSWER_MAX_COMPLETION_TOKENS,
            reasoning_effort=ANSWER_REASONING_EFFORT,
        )
    except OpenAIError as exc:
        raise _provider_failure(exc) from None
    except ValueError as exc:
        raise _unusable_output(f"completion reply could not be read ({type(exc).__name__})") from None
    try:
        answer = completion.choices[0].message.content
    except (AttributeError, IndexError, TypeError):
        raise _unusable_output("completion had no choices") from None
    # A cut-off answer can end mid-sentence with its citations missing, so it is not shown. It
    # reuses the "unusable" sentence, which the frontend already maps to its own screen. The
    # tokens were already billed, so they are logged; no query_history row is written.
    if getattr(completion.choices[0], "finish_reason", None) == "length":
        raise _unusable_output(
            f"answer hit max_completion_tokens={ANSWER_MAX_COMPLETION_TOKENS} "
            f"(completion_tokens={_token_count(completion, 'completion_tokens')})"
        )
    if not answer or not answer.strip():
        raise _unusable_output("completion content was empty")
    return answer, completion


def _general_knowledge_answer(payload: "QueryRequest") -> "QueryResponse":
    """The optional answer from the model's own knowledge, for a question with no matching specs (#172).

    No snippets are sent, only the question (and, in comparison mode, the names of the gadgets
    asked about, so "which is better?" still says which). The prompt forbids citations; any [n]
    marker that appears anyway has no snippet to point at, so it is removed and counted.
    Nothing is written to query_history: that table feeds the public trending list, and an
    unverified or off-topic question must not show up there.
    """
    gadget_note = ""
    if payload.gadget_ids:
        try:
            rows = (
                supabase.table("gadgets").select("id, name")
                .in_("id", [str(i) for i in payload.gadget_ids]).execute().data
            )
        except Exception as exc:
            raise _lookup_failure("gadget name lookup", exc) from None
        names = [r["name"] for r in rows or [] if r.get("name")]
        if names:
            gadget_note = "\n\nGadgets being asked about: " + ", ".join(names) + "."
    answer, completion = _generate_answer(
        build_general_knowledge_prompt(payload.plain_language), f"Question: {payload.question}{gadget_note}"
    )
    # Not written to query_history, so the cost stays visible in the log instead.
    logger.info(
        "General-knowledge answer: prompt_tokens=%s completion_tokens=%s",
        _token_count(completion, "prompt_tokens"), _token_count(completion, "completion_tokens"),
    )
    answer, invalid_citations_removed = strip_invalid_citations(answer, 0)
    if invalid_citations_removed:
        logger.warning("Removed %d citation marker(s) from a general-knowledge answer", invalid_citations_removed)
    return QueryResponse(
        answer=answer,
        sources=[],
        model_used=MODEL_USED,
        invalid_citations_removed=invalid_citations_removed,
        retrieval="none",
        answer_basis="general_knowledge",
    )


@router.post("", response_model=QueryResponse)
@limiter.limit("10/minute")
def ask_question(request: Request, payload: QueryRequest):
    simulated = _requested_simulation(request)
    if simulated:
        # Returns or raises before the cache is read or written, so a drill always shows the
        # failure it asked for and never leaves a cached answer behind (or a saved thread turn).
        return _simulated_failure(simulated)
    # Resolved before answering, so the query_history row already knows the question is private.
    thread_user = _thread_user(request, payload)
    response = _answer_question(request, payload, private=thread_user is not None)
    _save_thread_turn(thread_user, payload, response)
    return response


def _thread_user(request: Request, payload: "QueryRequest"):
    """The signed-in caller whose turn will be saved to user_questions, or None.

    Only a question about exactly one gadget with an Authorization header is looked up, so
    anonymous and comparison/catalog questions cost no extra Supabase call.
    """
    if not payload.gadget_ids or len(payload.gadget_ids) != 1:
        return None
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    try:
        return get_optional_user(authorization)
    except Exception:
        logger.warning("Session lookup for the gadget thread failed; the turn is not saved", exc_info=True)
        return None



def _save_thread_turn(user, payload: "QueryRequest", response: QueryResponse) -> None:
    """Per-gadget conversation (user_questions.sql): a signed-in user's question about exactly
    one gadget is saved with its full answer, so the gadget page can show the thread later.

    Only answers that reached this point are saved (errors and cut-off answers raised above).
    The route stays public: no session means nothing is saved. Like _record_query, this can
    never fail the request: the OpenAI calls are already billed by the time it runs.
    """
    if user is None:
        return
    try:
        if payload.regenerate:
            _drop_regenerated_turn(str(user.id), str(payload.gadget_ids[0]), payload.question)
        supabase.table("user_questions").insert(
            {
                "user_id": str(user.id),
                "gadget_id": str(payload.gadget_ids[0]),
                "question": payload.question,
                "response": response.model_dump(mode="json"),
            }
        ).execute()
    except Exception:
        logger.exception("user_questions insert failed; the answer is returned without saving the turn")


def _drop_regenerated_turn(user_id: str, gadget_id: str, question: str) -> None:
    """Delete the caller's newest saved turn for this exact question and gadget (only that one
    row), so a regenerated answer takes its place. Runs inside _save_thread_turn's guard."""
    rows = (
        supabase.table("user_questions")
        .select("id")
        .eq("user_id", user_id)
        .eq("gadget_id", gadget_id)
        .eq("question", question)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if rows:
        supabase.table("user_questions").delete().eq("id", rows[0]["id"]).eq("user_id", user_id).execute()


def _answer_question(request: Request, payload: "QueryRequest", *, private: bool = False) -> QueryResponse:
    # 0. The same question in the same scope (gadgets, plain-language flag, prompt version,
    #    models) is answered from answer_cache without any OpenAI call. The generation is
    #    read first, so an answer built from specs that change mid-request is not stored.
    #    An admin's X-Bypass-Answer-Cache skips both lookups; the fresh answer is still stored.
    bypass_cache = _admin_bypasses_cache(request)
    #    The general-knowledge flag is part of the scope (as a second prompt version), so a
    #    general-knowledge answer is never served to a request without the flag, or the reverse.
    prompt_scope = f"{PROMPT_VERSION}+{GK_PROMPT_VERSION}" if payload.allow_general_knowledge else PROMPT_VERSION
    cache_scope = answer_cache.scope_key(
        payload.gadget_ids, payload.plain_language, prompt_scope, EMBEDDING_MODEL, ANSWER_MODEL
    )
    cache_generation = answer_cache.current_generation()
    cached = None if bypass_cache else answer_cache.lookup_exact(cache_scope, payload.question)
    if cached:
        return _serve_cached(payload.question, cached, "exact", embedding_tokens=0, private=private)

    # 1. Embed the question the same way spec chunks were embedded
    try:
        embedding_response = client.embeddings.create(
            model=EMBEDDING_MODEL, input=[payload.question]
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

    # 1b. A reworded question that is very close to a cached one in the same scope reuses that
    #     answer: the embedding is already paid for, but the chat call (most of the cost) is not.
    cached = None if bypass_cache else answer_cache.lookup_similar(cache_scope, query_embedding)
    if cached:
        return _serve_cached(
            payload.question, cached, "similar",
            embedding_tokens=_token_count(embedding_response, "total_tokens"),
            private=private,
        )

    # 2. Retrieve the most relevant spec chunks via the SQL function in schema.sql
    # When the caller names gadgets (the gadget page and the compare page always do) the nearest
    # chunks of those gadgets are returned whatever their score: on the 20 evaluation questions the
    # right snippet was rank 1 or 2 every time but under 0.5 in 8 of them (#88), and a whole-spec
    # chunk scores lower for any one fact. The prompt already says "not stated" when a snippet does
    # not answer. Questions with no gadget scope (the catalog's ask box) keep the cutoff, so unrelated text is not sent.
    rpc_params = {
        "query_embedding": query_embedding,
        "match_count": MATCH_COUNT,
        "match_threshold": SCOPED_MATCH_THRESHOLD if payload.gadget_ids else MATCH_THRESHOLD,
    }
    if payload.gadget_ids:
        rpc_params["match_gadget_ids"] = [str(i) for i in payload.gadget_ids]

    try:
        matches = supabase.rpc("match_spec_documents", rpc_params).execute().data
    except Exception as exc:
        raise _lookup_failure("match_spec_documents", exc) from None

    # 2b. Nothing above the threshold: try a keyword match in the same scope (issue #88). Its
    #     chunks are numbered and cited exactly like vector chunks. It never fails the request.
    retrieval = "vector"
    if not matches:
        matches = _keyword_matches(payload.question, query_embedding, payload.gadget_ids)
        retrieval = "keyword" if matches else "none"

    if not matches and payload.allow_general_knowledge:
        # Only reached when retrieval found nothing in this scope. Cached under the flag's own
        # scope; not "grounded", so a similar question re-runs the free retrieval instead of
        # reusing it, and a cache hit is not written to query_history.
        response = _general_knowledge_answer(payload)
        answer_cache.store(
            cache_scope, payload.question, query_embedding, _cacheable(response, grounded=False), cache_generation
        )
        return response

    if not matches:
        # Cached too: every spec write through the API invalidates the answers it could
        # affect, so this cannot outlive specs being added that would change it.
        response = QueryResponse(answer=NO_MATCHES_ANSWER, sources=[], model_used="none", retrieval="none")
        answer_cache.store(
            cache_scope, payload.question, query_embedding, _cacheable(response, grounded=False), cache_generation
        )
        return response

    # 3. Attach gadget names to each matched chunk (the SQL function only returns gadget_id).
    #    In comparison mode also look up the gadgets that were *asked* about, so one with no
    #    matching specs can still be named rather than silently vanishing from the answer.
    requested_ids = [str(i) for i in payload.gadget_ids] if payload.gadget_ids else []
    gadget_ids_in_matches = list({m["gadget_id"] for m in matches})
    try:
        gadgets = (
            supabase.table("gadgets")
            .select("id, name, brand")
            .in_("id", list({*gadget_ids_in_matches, *requested_ids}))
            .execute()
            .data
        )
        gadget_lookup = {g["id"]: g for g in gadgets}
    except Exception as exc:
        raise _lookup_failure("gadget name lookup", exc) from None

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
    # Ids that match no gadget are left out: they add nothing the model could use.
    scope_note = ""
    known_requested = [gid for gid in requested_ids if gid in gadget_lookup]
    if known_requested:
        matched_ids = {m["gadget_id"] for m in matches}
        undocumented = [_name_of(gid) for gid in known_requested if gid not in matched_ids]
        scope_note = "\n\nGadgets in this comparison: " + ", ".join(_name_of(g) for g in known_requested) + "."
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
    answer, completion = _generate_answer(
        system_prompt, f"Spec snippets:\n{context}{scope_note}\n\nQuestion: {payload.question}"
    )

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
        embedding_tokens=_token_count(embedding_response, "total_tokens"),
        prompt_tokens=_token_count(completion, "prompt_tokens"),
        completion_tokens=_token_count(completion, "completion_tokens"),
        private=private,
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

    response = QueryResponse(
        answer=answer,
        sources=sources,
        model_used=MODEL_USED,
        invalid_citations_removed=invalid_citations_removed,
        retrieval=retrieval,
        answer_basis="specs",
    )
    # 7. Only a complete, validated answer reaches this line: errors, 503s and cut-off answers
    #    raised above, so they are never cached.
    answer_cache.store(
        cache_scope, payload.question, query_embedding, _cacheable(response, grounded=True), cache_generation
    )
    return response