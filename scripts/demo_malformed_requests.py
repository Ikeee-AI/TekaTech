"""Live demo: send malformed and unauthorized requests and show the app refuses each one safely.

Every request here is rejected before it can write data or call OpenAI, so it is safe against any
deployment and costs nothing: bad input is a 422 before the route runs, a missing or fake token is a
401, an unknown id or link is a 404 (a read). Nothing is created, changed or deleted.

    python scripts/demo_malformed_requests.py                              # local API on :8000
    python scripts/demo_malformed_requests.py --api-base https://tekatech-api.onrender.com

For each request it prints what was sent, the status and the message the user would see, and it
checks three things about every answer: the status is the expected one (never a 5xx), the body holds
no stack trace, key-shaped text or server file path, and the response carries an X-Request-ID.
The exit code is 1 if any check fails. Standard library only, like scripts/deployed_smoke.py.
"""
import argparse
import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

NOT_A_UUID = "not-a-uuid"
SOME_UUID = "00000000-0000-4000-8000-000000000000"  # well-formed, matches no gadget

# Text that must never appear in an error body: a Python traceback, a server path, or something key-shaped.
LEAKS = re.compile(r"Traceback|File \"|\.py\b|sk-[A-Za-z0-9]|sb_secret|sb_publishable|eyJ[A-Za-z0-9_-]{10,}|supabase\.co")


def _json(value):
    return json.dumps(value).encode("utf-8")


def cases():
    """(group, what we send, method, path, raw body or None, headers, expected status, expected message fragment)."""
    j = {"Content-Type": "application/json"}
    return [
        ("Malformed input", "Empty body", "POST", "/query", _json({}), j, 422, "required"),
        ("Malformed input", "Empty question", "POST", "/query", _json({"question": ""}), j, 422, ""),
        ("Malformed input", "Question over 150 characters", "POST", "/query", _json({"question": "a" * 151}), j, 422, "150"),
        ("Malformed input", "Not valid JSON", "POST", "/query", b'{"question": ', j, 422, ""),
        ("Malformed input", "Wrong type for plain_language (bare NaN)", "POST", "/query", b'{"question": "x", "plain_language": NaN}', j, 422, ""),
        ("Malformed input", "A gadget id that is not a UUID", "POST", "/query", _json({"question": "x", "gadget_ids": [NOT_A_UUID]}), j, 422, ""),
        ("Malformed input", "Six gadgets in one question (limit is 5)", "POST", "/query", _json({"question": "x", "gadget_ids": [SOME_UUID.replace("0", str(i), 1) for i in range(1, 7)]}), j, 422, ""),
        ("Malformed input", "Compare only one gadget", "POST", "/comparisons", _json({"gadget_ids": [SOME_UUID]}), j, 422, "at least"),
        ("Malformed input", "Path id that is not a UUID", "GET", f"/gadgets/{NOT_A_UUID}", None, {}, 422, ""),
        ("Malformed input", "Trending questions with limit=999", "GET", "/stats/trending-questions?limit=999", None, {}, 422, ""),
        ("Not allowed", "Create a gadget with no login", "POST", "/gadgets", _json({"name": "x", "brand": "x", "category": "x"}), j, 401, "Login required"),
        ("Not allowed", "Create a gadget with a fake token", "POST", "/gadgets", _json({"name": "x", "brand": "x", "category": "x"}), {**j, "Authorization": "Bearer not-a-real-session"}, 401, "Invalid or expired"),
        ("Not allowed", "Delete a gadget with no login", "DELETE", f"/gadgets/{SOME_UUID}", None, {}, 401, "Login required"),
        ("Not allowed", "Read the admin review queue with no login", "GET", "/corrections", None, {}, 401, "Login required"),
        ("Not found", "A well-formed gadget id that does not exist", "GET", f"/gadgets/{SOME_UUID}", None, {}, 404, "not found"),
        ("Not found", "A share link that does not exist", "GET", "/comparisons/zzzzzzz", None, {}, 404, "not found"),
    ]


def send_http(api_base):
    def send(method, path, body, headers):
        request = Request(api_base + path, data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as response:
                return response.status, dict(response.headers.items()), response.read().decode("utf-8", "replace")
        except HTTPError as exc:
            return exc.code, dict(exc.headers.items()), exc.read().decode("utf-8", "replace")

    return send


def message_of(text):
    """The sentence a user would see: FastAPI's first validation message, or the plain `detail` string."""
    try:
        detail = json.loads(text).get("detail")
    except (ValueError, AttributeError):
        return text[:100]
    if isinstance(detail, list) and detail:
        return str(detail[0].get("msg", ""))
    return str(detail)


def run(send, out=print):
    """Send every case through `send`; return the list of problems (empty means every check passed)."""
    problems, group = [], None
    for g, what, method, path, body, headers, want_status, want_text in cases():
        if g != group:
            out(f"\n== {g}")
            group = g
        status, response_headers, text = send(method, path, body, headers)
        message = message_of(text)
        out(f"  {what:<46} -> {status}  {message[:80]}")
        if status != want_status:
            problems.append(f"{what}: expected {want_status}, got {status}")
        if want_text and want_text.lower() not in message.lower():
            problems.append(f"{what}: message should mention {want_text!r}, got {message[:80]!r}")
        if LEAKS.search(text):
            problems.append(f"{what}: the response contains something that must not be shown ({LEAKS.search(text).group(0)!r})")
        if not any(k.lower() == "x-request-id" for k in response_headers):
            problems.append(f"{what}: no X-Request-ID header")
    return problems


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--api-base", default="http://127.0.0.1:8000")
    args = parser.parse_args(argv)
    api_base = args.api_base.rstrip("/")
    print(f"Malformed and unauthorized requests against {api_base} (nothing is written, no AI call is made)")
    try:
        problems = run(send_http(api_base))
    except URLError as exc:
        print(f"\nCould not reach {api_base}: {exc.reason}. A free host may be waking up: open /health first and retry.")
        return 2
    print()
    if problems:
        print("FAILED:")
        for problem in problems:
            print("  -", problem)
        return 1
    print("Every request was refused safely: expected status, no stack trace, key or file path, and a request id on each.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
