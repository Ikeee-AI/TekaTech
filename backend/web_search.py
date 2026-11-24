"""OpenAI web search for TekaTech (S5-IK, 24 Nov 2026).

Two users of it:
- routers/query.py: the optional "search the web" answer for a question the saved specs don't
  cover (allow_web_search, off by default). Labelled as web-sourced and unverified.
- routers/web_drafts.py: the admin's "find on the web" drafts of spec lines and benchmarks,
  which an admin reviews before anything is saved.

The Responses API's web_search tool returns url_citation annotations (character ranges in the
answer text plus the page URL and title). They are turned into TekaTech's own [n] markers here,
one number per distinct page, because AnswerText.jsx renders only [n], **bold** and "- " bullets:
a raw markdown link would show up as literal text.

Cost: each search is billed per call on top of the tokens, and the page text it reads is billed
as input tokens, so a web answer costs far more than a grounded one. Callers cap it
(ai_quota.consume_web_search); search_context_size stays "low".
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from openai import OpenAI, OpenAIError

from config import settings

WEB_MODEL = "gpt-5-mini"
WEB_MAX_OUTPUT_TOKENS = 3000
WEB_TIMEOUT_SECONDS = 60
MAX_WEB_SOURCES = 8

client = OpenAI(
    api_key=settings.openai_api_key.get_secret_value(),
    timeout=WEB_TIMEOUT_SECONDS,
    max_retries=1,
)


class WebSearchError(Exception):
    """The web search call failed or returned nothing usable. `reason` is for logs, not users."""

    def __init__(self, reason: str, *, provider: OpenAIError | None = None):
        super().__init__(reason)
        self.reason = reason
        self.provider = provider


@dataclass
class WebCitation:
    url: str
    title: str


@dataclass
class WebResult:
    text: str
    citations: list[WebCitation] = field(default_factory=list)
    input_tokens: int | None = None
    output_tokens: int | None = None
    searches: int = 0
    # url_citation annotations with indices on `text`; citations_to_markers() turns them into [n].
    annotations: list = field(default_factory=list)


_MD_LINK = re.compile(r"\[([^\]\n]{1,200})\]\((https?://[^)\s]+)\)")
_BARE_URL = re.compile(r"\(?\s*https?://[^\s)\]]+\s*\)?")
_EMPTY_PARENS = re.compile(r"\(\s*\)")


def _tidy(text: str) -> str:
    text = _EMPTY_PARENS.sub("", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"[ \t]+([.,;:!?])", r"\1", text)
    # "[1][2]" reads better with a space; "word [1]" already has one.
    text = re.sub(r"\](?=\[\d)", "] ", text)
    return text.strip()


def citations_to_markers(text: str, annotations: list) -> tuple[str, list[WebCitation]]:
    """Replace each url_citation span with [n] (n = the page's number, first cited = 1).

    Spans are replaced from the end so earlier indices stay valid. Overlapping or out-of-range
    spans are skipped. Markdown links and bare URLs the model wrote anyway are reduced to their
    text, since the UI would show them literally. At most MAX_WEB_SOURCES pages get numbers.
    """
    numbered: dict[str, int] = {}
    citations: list[WebCitation] = []
    spans = []
    for a in annotations or []:
        if getattr(a, "type", None) != "url_citation":
            continue
        url = getattr(a, "url", "") or ""
        start, end = getattr(a, "start_index", None), getattr(a, "end_index", None)
        if not url.startswith(("http://", "https://")) or start is None or end is None:
            continue
        if not (0 <= start <= end <= len(text)):
            continue
        if url not in numbered:
            if len(citations) >= MAX_WEB_SOURCES:
                continue
            numbered[url] = len(citations) + 1
            citations.append(WebCitation(url=clean_url(url), title=(getattr(a, "title", "") or "").strip()[:200]))
        spans.append((start, end, numbered[url]))

    spans.sort(key=lambda s: s[0], reverse=True)
    last_start = len(text) + 1
    out = text
    for start, end, n in spans:
        if end > last_start:  # overlaps a span already replaced
            continue
        out = out[:start] + f" [{n}]" + out[end:]
        last_start = start
    out = _MD_LINK.sub(r"\1", out)
    out = _BARE_URL.sub(" ", out)
    return _tidy(out), citations


def search(instructions: str, user_input: str, *, max_output_tokens: int = WEB_MAX_OUTPUT_TOKENS,
           reasoning_effort: str = "low", json_schema: dict | None = None) -> WebResult:
    """One Responses API call with the web_search tool. Raises WebSearchError on any failure."""
    kwargs = dict(
        model=WEB_MODEL,
        instructions=instructions,
        input=user_input,
        tools=[{"type": "web_search", "search_context_size": "low"}],
        max_output_tokens=max_output_tokens,
        reasoning={"effort": reasoning_effort},
    )
    if json_schema:
        kwargs["text"] = {"format": {"type": "json_schema", "name": "drafts", "schema": json_schema, "strict": True}}
    try:
        response = client.responses.create(**kwargs)
    except OpenAIError as exc:
        raise WebSearchError(f"provider error {type(exc).__name__}", provider=exc) from None
    except ValueError as exc:
        raise WebSearchError(f"reply could not be read ({type(exc).__name__})") from None

    if getattr(response, "status", "completed") == "incomplete":
        reason = getattr(getattr(response, "incomplete_details", None), "reason", "unknown")
        raise WebSearchError(f"response incomplete ({reason})")

    texts, annotations, searches = [], [], 0
    offset = 0
    for item in getattr(response, "output", None) or []:
        kind = getattr(item, "type", None)
        if kind == "web_search_call":
            searches += 1
        if kind != "message":
            continue
        for part in getattr(item, "content", None) or []:
            if getattr(part, "type", None) != "output_text":
                continue
            part_text = getattr(part, "text", "") or ""
            # Annotation indices are relative to their own part; shift them onto the joined text.
            for a in getattr(part, "annotations", None) or []:
                if getattr(a, "type", None) == "url_citation":
                    annotations.append(_Shifted(a, offset))
            texts.append(part_text)
            offset += len(part_text) + 2
    text = "\n\n".join(texts)
    if not text.strip():
        raise WebSearchError("response had no text")
    usage = getattr(response, "usage", None)
    return WebResult(
        text=text,
        input_tokens=getattr(usage, "input_tokens", None),
        output_tokens=getattr(usage, "output_tokens", None),
        searches=searches,
        annotations=annotations,
    )


class _Shifted:
    """A url_citation annotation with its indices moved onto the joined answer text."""

    def __init__(self, annotation, offset: int):
        self.type = "url_citation"
        self.url = getattr(annotation, "url", "")
        self.title = getattr(annotation, "title", "")
        self.start_index = getattr(annotation, "start_index", 0) + offset
        self.end_index = getattr(annotation, "end_index", 0) + offset



_TRACKING_PARAMS = re.compile(r"^(utm_[a-z]+|msockid|gclid|fbclid|ref|ref_src|srsltid)$", re.IGNORECASE)


def clean_url(url: str) -> str:
    """Drop tracking query parameters (utm_*, msockid, gclid…) that search results carry."""
    parts = urlsplit(url)
    if not parts.query:
        return url
    kept = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _TRACKING_PARAMS.match(k)]
    return urlunsplit(parts._replace(query=urlencode(kept)))


def site_name(url: str) -> str:
    """The page's host without "www.", for a source card's heading."""
    host = urlsplit(url).hostname or "web page"
    return host[4:] if host.startswith("www.") else host
