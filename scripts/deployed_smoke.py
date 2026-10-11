"""Check public deployed version, frontend shell, database path and CORS. No AI calls."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def fetch(url, origin=None):
    headers = {"Origin": origin} if origin else {}
    with urlopen(Request(url, headers=headers), timeout=15) as response:
        return response.read().decode("utf-8"), dict(response.headers.items())


def check_deployment(api_url, frontend_url, commit, request=fetch):
    api_url, frontend_url = api_url.rstrip("/"), frontend_url.rstrip("/")
    for url in (api_url, frontend_url):
        parsed = urlparse(url)
        if parsed.scheme not in {"https", "http"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path:
            raise ValueError("Use plain http(s) origins without credentials, paths or query strings")
    health, _ = request(f"{api_url}/health")
    if json.loads(health).get("status") != "ok":
        raise ValueError("Backend liveness failed")
    backend_version, _ = request(f"{api_url}/version")
    frontend_version, _ = request(f"{frontend_url}/version.json")
    if json.loads(backend_version).get("commit") != commit or json.loads(frontend_version).get("commit") != commit:
        raise ValueError("Both hosts must serve the expected commit")
    gadgets, headers = request(f"{api_url}/gadgets", origin=frontend_url)
    rows = json.loads(gadgets)
    if not isinstance(rows, list):
        raise ValueError("Database-backed endpoint must return a gadget list")
    lowered = {key.lower(): value for key, value in headers.items()}
    if lowered.get("access-control-allow-origin") != frontend_url:
        raise ValueError("Production CORS must allow the frontend origin")
    html, _ = request(frontend_url)
    if 'id="root"' not in html:
        raise ValueError("Frontend React shell missing")
    return {"commit": commit, "gadget_count": len(rows), "cors": "passed"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--frontend-url", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--attempts", type=int, default=1)
    parser.add_argument("--delay", type=float, default=10)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if not 1 <= args.attempts <= 60 or not 0 <= args.delay <= 30:
        parser.error("attempts must be 1-60; delay must be 0-30 seconds")
    started = time.monotonic()
    report = None
    for attempt in range(1, args.attempts + 1):
        try:
            detail = check_deployment(args.api_url, args.frontend_url, args.commit)
            report = {"status": "passed", "checked_at": datetime.now(timezone.utc).isoformat(),
                      "attempts": attempt, "wait_seconds": round(time.monotonic() - started, 2), **detail}
            break
        except Exception as exc:
            # Avoid printing raw network/provider error messages or unexpected content.
            reason = str(exc) if type(exc) is ValueError else type(exc).__name__
            print(f"Deployment smoke attempt {attempt}/{args.attempts}: {reason}", flush=True)
            report = {"status": "failed", "commit": args.commit, "error_type": type(exc).__name__, "reason": reason,
                      "http_status": getattr(exc, "code", None)}
            if attempt < args.attempts:
                time.sleep(args.delay)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
