"""Compute weekly DevOps delivery metrics from real GitHub Actions runs. Read-only.

Uses the authenticated GitHub CLI (`gh api`). Never deploys, re-runs or edits
anything. Values with no supporting runs are reported as None ("N/A"), never 0.
Recovery time needs incident data and is always N/A here; take it from
docs/devops/incidents.md.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path
import subprocess
import sys
import time

DEPLOY_JOB = "Deploy main after checks"
CHECK_CONCLUSIONS = {"success", "failure", "timed_out", "startup_failure"}

# One window makes 100+ sequential API calls, so a single dropped connection or GitHub 5xx
# used to abort the whole report (5 Nov 2026: TLS handshake timeouts, one HTTP 502).
# Transient failures are retried with a short backoff; auth/permission/not-found are not.
RETRY_DELAYS = (2, 5, 10)
TRANSIENT_MARKERS = ("timeout", "timed out", "tls handshake", "connection reset", "connection refused",
                     "error connecting", "eof", "http 500", "http 502", "http 503", "http 504",
                     "server error", "bad gateway", "temporarily unavailable")


def is_transient(stderr):
    text = (stderr or "").lower()
    return any(marker in text for marker in TRANSIENT_MARKERS)


def gh_api(path, jq=None, paginate=False, sleep=time.sleep):
    command = ["gh", "api", path]
    if paginate:
        command.append("--paginate")
    if jq:
        command += ["--jq", jq]
    for attempt, delay in enumerate((*RETRY_DELAYS, None), start=1):
        result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
        if result.returncode == 0:
            output = result.stdout
            return [json.loads(line) for line in output.splitlines() if line.strip()] if jq else json.loads(output)
        if delay is None or not is_transient(result.stderr):
            if result.stderr:
                sys.stderr.write(result.stderr)
            raise subprocess.CalledProcessError(result.returncode, command, result.stdout, result.stderr)
        sys.stderr.write(f"gh api {path}: transient error (attempt {attempt}), retrying in {delay} s\n")
        sleep(delay)


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


def minutes(start, end):
    return round((parse_time(end) - parse_time(start)).total_seconds() / 60, 2)


def average(values):
    return round(sum(values) / len(values), 2) if values else None


def summarize(runs, deploy_jobs, merge_times):
    """Pure computation, so it can be tested without GitHub.

    runs: workflow-run dicts; deploy_jobs: run id -> deploy job dict (or None);
    merge_times: head sha -> PR merged_at (or None for direct pushes).
    """
    completed = [run for run in runs if run["status"] == "completed"]
    cancelled = [run for run in completed if run["conclusion"] in {"cancelled", "skipped"}]
    eligible = [run for run in completed if run["conclusion"] in CHECK_CONCLUSIONS]
    pr_runs = [run for run in eligible if run["event"] == "pull_request"]
    main_runs = [run for run in eligible if run["event"] == "push" and run["head_branch"] == "main"]
    successful = [run for run in eligible if run["conclusion"] == "success"]

    deploys, failed_deploys, ci_failures_on_main, lead_times = [], [], [], []
    for run in main_runs:
        job = deploy_jobs.get(run["id"])
        if job is None or job["conclusion"] == "skipped":
            if run["conclusion"] != "success":
                ci_failures_on_main.append(run["html_url"])
            continue
        if job["conclusion"] == "success":
            deploys.append(run["html_url"])
            merged_at = merge_times.get(run["head_sha"])
            if merged_at:
                lead_times.append(minutes(merged_at, job["completed_at"]))
        elif job["conclusion"] in CHECK_CONCLUSIONS:
            failed_deploys.append(run["html_url"])

    return {
        "pr_pipeline_avg_min": average([minutes(r["run_started_at"], r["updated_at"]) for r in pr_runs]),
        "pr_run_count": len(pr_runs),
        "main_pipeline_avg_min": average([minutes(r["run_started_at"], r["updated_at"]) for r in main_runs]),
        "main_run_count": len(main_runs),
        "success_rate_pct": round(100 * len(successful) / len(eligible), 1) if eligible else None,
        "success_numerator": len(successful),
        "success_denominator": len(eligible),
        "cancelled_or_skipped_runs": len(cancelled),
        "production_deploys": len(deploys),
        "deploy_runs": deploys,
        "merge_to_live_avg_min": average(lead_times),
        "lead_time_samples": len(lead_times),
        "failed_deploys": len(failed_deploys),
        "failed_deploy_runs": failed_deploys,
        "ci_failures_on_main": ci_failures_on_main,
        "recovery_min": None,
    }


def fmt(value, suffix=""):
    return "N/A" if value is None else f"{value}{suffix}"


def markdown_row(label, m):
    return (
        f"| {label} | {fmt(m['pr_pipeline_avg_min'])} ({m['pr_run_count']} runs) "
        f"| {fmt(m['main_pipeline_avg_min'])} ({m['main_run_count']} runs) "
        f"| {fmt(m['success_rate_pct'])} ({m['success_numerator']}/{m['success_denominator']} completed) "
        f"| {m['production_deploys']} | {fmt(m['merge_to_live_avg_min'])} ({m['lead_time_samples']} samples) "
        f"| {m['failed_deploys']} | N/A (see incident log) | |"
    )


def collect(repo, since, until, workflow):
    runs = gh_api(
        f"repos/{repo}/actions/workflows/{workflow}/runs?per_page=100&created={since}..{until}",
        jq=".workflow_runs[] | {id, event, status, conclusion, head_sha, head_branch, run_started_at, updated_at, html_url}",
        paginate=True,
    )
    deploy_jobs, merge_times = {}, {}
    for run in runs:
        if run["event"] != "push" or run["head_branch"] != "main" or run["status"] != "completed":
            continue
        jobs = gh_api(f"repos/{repo}/actions/runs/{run['id']}/jobs?per_page=100")["jobs"]
        deploy_jobs[run["id"]] = next((job for job in jobs if job["name"] == DEPLOY_JOB), None)
        pulls = gh_api(f"repos/{repo}/commits/{run['head_sha']}/pulls")
        merge_times[run["head_sha"]] = next((pr["merged_at"] for pr in pulls if pr.get("merged_at")), None)
    return runs, deploy_jobs, merge_times


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="Ikeee-AI/TekaTech")
    parser.add_argument("--since", required=True, help="UTC date, e.g. 2026-10-12")
    parser.add_argument("--until", required=True, help="UTC date, e.g. 2026-10-18")
    parser.add_argument("--label", default="Sprint")
    parser.add_argument("--workflow", default="ci.yml")
    parser.add_argument("--report", type=Path, help="Write the full JSON report here")
    args = parser.parse_args()
    try:
        runs, deploy_jobs, merge_times = collect(args.repo, args.since, args.until, args.workflow)
    except (subprocess.CalledProcessError, FileNotFoundError) as error:
        sys.exit(f"GitHub query failed ({type(error).__name__}); check `gh auth status` and repository access")
    metrics = summarize(runs, deploy_jobs, merge_times)
    report = {"repo": args.repo, "window": [args.since, args.until], "workflow": args.workflow, **metrics}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(markdown_row(args.label, metrics))


if __name__ == "__main__":
    main()
