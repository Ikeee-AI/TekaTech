"""Local probe of the TechSpecs API with a free-trial key. Prints only; stores nothing.

Purpose: check backend/techspecs.py's parser against the real (undocumented) response format
before any import is authorized. TechSpecs' terms forbid downloading or caching their data
without written authorization, so this script:

- writes nothing: no database, no files, no cache; output goes to the terminal only;
- makes at most 3 calls (1 search + up to 2 product lookups), and none without --yes;
- prints the response *shape* (keys, types, list lengths) and the parser's result (line counts,
  section names). Spec values are shown only with --show-values, still on screen only;
- never prints the API id or key.

It ignores TECHSPECS_ENABLED on purpose (that flag guards the app's routes, not this local
check), but needs TECHSPECS_API_ID and TECHSPECS_API_KEY in backend/.env. Never run it in CI or
on Render, and don't paste its --show-values output into the repo, an issue or a PR.

    cd backend
    uv run --frozen python scripts/techspecs_probe.py                 # plan only, no calls
    uv run --frozen python scripts/techspecs_probe.py --yes           # 1 search + up to 2 lookups
    uv run --frozen python scripts/techspecs_probe.py --yes --products 1 --query "Galaxy S24"
"""
import argparse
from collections import Counter
from pathlib import Path
import sys
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402

import techspecs  # noqa: E402
from techspecs import TechSpecsError  # noqa: E402

MAX_PRODUCTS = 2
SHAPE_DEPTH = 7  # data -> items -> [0] -> section -> field is already 5 levels
SHAPE_KEYS = 40


def shape(value: Any, depth: int = 0, indent: str = "") -> list[str]:
    """Keys, types and list lengths of a JSON value; never the values themselves."""
    pad = indent + "  "
    if isinstance(value, dict):
        if depth >= SHAPE_DEPTH:
            return [f"{indent}object ({len(value)} keys, not expanded)"]
        lines = [f"{indent}object ({len(value)} keys)"]
        for i, (key, child) in enumerate(value.items()):
            if i >= SHAPE_KEYS:
                lines.append(f"{pad}... {len(value) - SHAPE_KEYS} more keys")
                break
            sub = shape(child, depth + 1, pad + "  ")
            lines.append(f"{pad}{str(key)[:60]}: {sub[0].strip()}")
            lines.extend(sub[1:])
        return lines
    if isinstance(value, list):
        if not value:
            return [f"{indent}list (empty)"]
        sub = shape(value[0], depth + 1, pad)
        return [f"{indent}list ({len(value)} items), first item: {sub[0].strip()}"] + sub[1:]
    if value is None:
        return [f"{indent}null"]
    return [f"{indent}{type(value).__name__}"]


ERROR_BODY_CHARS = 500


class ErrorCapture:
    """httpx response hook: keeps status and body of a *failed* call so the probe can show
    TechSpecs' error message. Error bodies describe our request, not product data. Credentials
    are masked in case the provider echoes them."""

    def __init__(self):
        self.status: int | None = None
        self.body = ""

    def __call__(self, response):
        if response.status_code >= 400:
            response.read()
            self.status = response.status_code
            text = response.text[:ERROR_BODY_CHARS]
            try:
                api_id, api_key = techspecs._credentials()
                for secret in (api_id, api_key):
                    text = text.replace(secret, "***")
            except TechSpecsError:
                pass
            self.body = text


def print_error(exc: TechSpecsError, capture: ErrorCapture) -> None:
    print(f"FAILED: {exc.kind} (HTTP {exc.status_code or '-'})")
    if capture.status is not None:
        print(f"TechSpecs error message (first {ERROR_BODY_CHARS} characters, key masked):")
        print(f"  {capture.body or '(empty body)'}")


class CountingGet:
    """Wraps techspecs._get: counts calls, enforces the cap, keeps the last raw payload."""

    def __init__(self, original, limit: int):
        self.original = original
        self.limit = limit
        self.calls = 0
        self.last_payload: Any = None

    def __call__(self, path, params):
        if self.calls >= self.limit:
            raise RuntimeError(f"call cap reached ({self.limit}); stopping")
        self.calls += 1
        self.last_payload = self.original(path, params)
        return self.last_payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--query", default="iPhone 15", help="search text (2-100 characters)")
    parser.add_argument("--products", type=int, default=MAX_PRODUCTS, help=f"product lookups, 0-{MAX_PRODUCTS}")
    parser.add_argument("--yes", action="store_true", help="actually call TechSpecs")
    parser.add_argument("--show-values", action="store_true", help="also print parsed spec lines (screen only)")
    args = parser.parse_args(argv)

    if not 2 <= len(args.query.strip()) <= 100:
        parser.error("--query must be 2-100 characters")
    products = max(0, min(args.products, MAX_PRODUCTS))
    limit = 1 + products
    print(f"Plan: 1 search for {args.query.strip()!r} + up to {products} product lookup(s) = at most {limit} calls.")
    print("Nothing is stored. Output is shape and counts" + (" plus spec values (screen only)." if args.show_values else "."))
    if not args.yes:
        print("No calls made. Re-run with --yes to call TechSpecs.")
        return 0

    counter = CountingGet(techspecs._get, limit)
    capture = ErrorCapture()
    original_client = techspecs._make_client
    techspecs._get = counter
    techspecs._make_client = lambda: httpx.Client(
        base_url=techspecs.BASE_URL, timeout=techspecs.TIMEOUT, event_hooks={"response": [capture]}
    )
    try:
        print("\n== Search")
        try:
            results = techspecs.search(args.query.strip(), page=0, size=5)
        except TechSpecsError as exc:
            print_error(exc, capture)
            return 1
        print("Raw response shape:")
        print("\n".join(shape(counter.last_payload, indent="  ")))
        print(f"Parser kept {len(results)} result(s) with a usable id.")
        for r in results:
            print(f"  id={r['id']}  name={r['name']!r}  category={r['category']!r}")
        if not results:
            print("No usable ids: _items()/_summary() guesses don't match this format. See the shape above.")
            return 1

        ok = True
        for r in results[:products]:
            print(f"\n== Product {r['id']}")
            try:
                product = techspecs.get_product(r["id"])
            except TechSpecsError as exc:
                print_error(exc, capture)
                if counter.last_payload is not None and exc.kind == "bad_response":
                    print("Raw response shape:")
                    print("\n".join(shape(counter.last_payload, indent="  ")))
                ok = False
                continue
            print("Raw response shape:")
            print("\n".join(shape(counter.last_payload, indent="  ")))
            sections = Counter(line.split(" / ", 1)[0].split(":", 1)[0] for line in product["lines"])
            text_chars = sum(len(line) + 1 for line in product["lines"])
            print(f"Parsed name: {product['name']!r}")
            print(f"Parsed {len(product['lines'])} spec line(s), about {text_chars} characters, {len(sections)} section(s):")
            for name, count in sections.most_common():
                print(f"  {name}: {count}")
            if args.show_values:
                print("Spec lines (screen only, do not save):")
                for line in product["lines"]:
                    print(f"  {line}")
    finally:
        techspecs._get = counter.original
        techspecs._make_client = original_client
        print(f"\nCalls made: {counter.calls} of at most {limit}. Nothing was stored.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
