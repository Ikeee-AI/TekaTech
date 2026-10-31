"""Sample production health during the Sprint 5 pilot, then summarise the samples. Read-only.

Runs on a laptop, not in GitHub Actions: 48 hours at one sample every 5 minutes would be about
576 workflow runs, and Actions minutes are the limit that stopped CI on 31 Oct
(docs/devops/incidents.md). Uses the standard library only.

Each sample makes three public GET requests: API `/health/ready` (database round trip), API
`/version` (deployed commit), and the frontend shell. It records status, latency and errors in
one JSON line. No login, no writes, no AI calls, no user data.

  python scripts/pilot_monitor.py sample --out .local/pilot/samples.jsonl --interval 300 --hours 48
  python scripts/pilot_monitor.py summary --samples .local/pilot/samples.jsonl --markdown .local/pilot/report.md

A gap longer than twice the interval (laptop asleep or offline) is reported as a gap in
coverage, never counted as downtime.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import statistics
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "https://tekatech-api.onrender.com"
FRONTEND_URL = "https://tekatech-web.onrender.com"
TIMEOUT_SECONDS = 90  # a cold Render free instance has taken 42–55 s to answer
COLD_START_SECONDS = 10.0  # a first response slower than this is counted as a cold start


def probe(url):
    """One GET: status, seconds and a short error label. Never raises."""
    started = time.perf_counter()
    try:
        with urlopen(Request(url, headers={"User-Agent": "tekatech-pilot-monitor"}),
                     timeout=TIMEOUT_SECONDS) as response:
            body = response.read(4096).decode("utf-8", "replace")
            return {"status": response.status, "seconds": round(time.perf_counter() - started, 3),
                    "body": body, "error": None}
    except HTTPError as exc:
        return {"status": exc.code, "seconds": round(time.perf_counter() - started, 3),
                "body": "", "error": f"HTTP {exc.code}"}
    except (URLError, TimeoutError, OSError) as exc:
        reason = getattr(exc, "reason", exc)
        return {"status": None, "seconds": round(time.perf_counter() - started, 3),
                "body": "", "error": type(reason).__name__}


def take_sample(fetch=probe, now=None):
    ready = fetch(f"{API_URL}/health/ready")
    version = fetch(f"{API_URL}/version")
    web = fetch(FRONTEND_URL)
    try:
        commit = json.loads(version["body"]).get("commit") if version["status"] == 200 else None
    except (ValueError, AttributeError):
        commit = None
    return {
        "at": (now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        "api_ready": {"status": ready["status"], "seconds": ready["seconds"], "error": ready["error"]},
        "web": {"status": web["status"], "seconds": web["seconds"], "error": web["error"]},
        "commit": (commit or "")[:7] or None,
    }


def is_up(part):
    return part["status"] == 200


def percentile(values, pct):
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round(pct / 100 * (len(ordered) - 1))))
    return round(ordered[index], 3)


def summarise(samples, interval_seconds):
    """Pure computation over the sample list, so it can be tested without the network."""
    if not samples:
        return {"samples": 0}
    times = [datetime.fromisoformat(s["at"]) for s in samples]
    gaps = []
    for previous, current in zip(times, times[1:]):
        if (current - previous).total_seconds() > 2 * interval_seconds:
            gaps.append({"from": previous.isoformat(), "to": current.isoformat(),
                         "minutes": round((current - previous).total_seconds() / 60, 1)})
    report = {
        "samples": len(samples),
        "first": samples[0]["at"], "last": samples[-1]["at"],
        "observed_hours": round((times[-1] - times[0]).total_seconds() / 3600, 2),
        "interval_seconds": interval_seconds,
        "coverage_gaps": gaps,
        "commits_seen": sorted({s["commit"] for s in samples if s.get("commit")}),
    }
    for key in ("api_ready", "web"):
        parts = [s[key] for s in samples]
        up = [p for p in parts if is_up(p)]
        latencies = [p["seconds"] for p in up]
        warm = [x for x in latencies if x < COLD_START_SECONDS]
        errors = {}
        for p in parts:
            if not is_up(p):
                label = p["error"] or f"HTTP {p['status']}"
                errors[label] = errors.get(label, 0) + 1
        report[key] = {
            "up": len(up), "total": len(parts),
            "availability_pct": round(100 * len(up) / len(parts), 2),
            "cold_starts": len([x for x in latencies if x >= COLD_START_SECONDS]),
            "cold_start_max_s": max([x for x in latencies if x >= COLD_START_SECONDS], default=None),
            "warm_median_s": round(statistics.median(warm), 3) if warm else None,
            "warm_p95_s": percentile(warm, 95),
            "errors": errors,
        }
    # Consecutive API-down samples, as candidate incidents for docs/devops/incidents.md.
    outages, run = [], []
    for s in samples:
        if not is_up(s["api_ready"]):
            run.append(s["at"])
        elif run:
            outages.append({"from": run[0], "to": run[-1], "samples": len(run)})
            run = []
    if run:
        outages.append({"from": run[0], "to": run[-1], "samples": len(run)})
    report["api_outages"] = outages
    return report


def seconds(value):
    return "-" if value is None else f"{value} s"


def markdown(report):
    if not report.get("samples"):
        return "# Pilot observation report\n\nNo samples recorded.\n"
    lines = [
        "# Pilot observation report", "",
        f"Samples {report['samples']} from {report['first']} to {report['last']} "
        f"({report['observed_hours']} h, one every {report['interval_seconds']} s). "
        f"Commits seen: {', '.join(report['commits_seen']) or 'none'}.", "",
        "| Target | Up | Availability | Cold starts (>=10 s) | Slowest cold start | Warm median | Warm p95 | Errors |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for key, label in (("api_ready", "API /health/ready"), ("web", "Frontend")):
        r = report[key]
        errors = ", ".join(f"{k} x{v}" for k, v in r["errors"].items()) or "none"
        lines.append(f"| {label} | {r['up']}/{r['total']} | {r['availability_pct']}% | {r['cold_starts']} | "
                     f"{seconds(r['cold_start_max_s'])} | {seconds(r['warm_median_s'])} | "
                     f"{seconds(r['warm_p95_s'])} | {errors} |")
    lines += ["", f"**API outages (consecutive failed samples):** {len(report['api_outages'])}"]
    lines += [f"- {o['from']} to {o['to']} ({o['samples']} samples)" for o in report["api_outages"]]
    lines += ["", f"**Coverage gaps (monitor not running, not downtime):** {len(report['coverage_gaps'])}"]
    lines += [f"- {g['from']} to {g['to']} ({g['minutes']} min)" for g in report["coverage_gaps"]]
    return "\n".join(lines) + "\n"


def run_sampler(out, interval, hours):
    out.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + hours * 3600
    while time.monotonic() < deadline:
        sample = take_sample()
        with out.open("a", encoding="utf-8") as handle:  # append: safe to stop and restart
            handle.write(json.dumps(sample) + "\n")
        api, web = sample["api_ready"], sample["web"]
        print(f"{sample['at']} api {api['status']} {api['seconds']}s | web {web['status']} "
              f"{web['seconds']}s | {sample['commit']}", flush=True)
        time.sleep(max(0, interval - api["seconds"] - web["seconds"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    sample = commands.add_parser("sample", help="append samples until --hours have passed")
    sample.add_argument("--out", type=Path, required=True)
    sample.add_argument("--interval", type=int, default=300)
    sample.add_argument("--hours", type=float, default=48)
    summary = commands.add_parser("summary", help="summarise a samples file")
    summary.add_argument("--samples", type=Path, required=True)
    summary.add_argument("--interval", type=int, default=300)
    summary.add_argument("--report", type=Path)
    summary.add_argument("--markdown", type=Path)
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")  # Windows consoles are often cp1252

    if args.command == "sample":
        run_sampler(args.out, args.interval, args.hours)
        return 0
    samples = [json.loads(line) for line in args.samples.read_text(encoding="utf-8").splitlines() if line.strip()]
    report = summarise(samples, args.interval)
    if args.report:
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    text = markdown(report)
    if args.markdown:
        args.markdown.write_text(text, encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
