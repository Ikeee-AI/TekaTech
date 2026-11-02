"""Time the live deploy challenge (visible change -> reviewed PR -> merge -> deploy) from GitHub records.

Read-only: uses the authenticated GitHub CLI (`gh api`) and, with --smoke, the existing
`scripts/deployed_smoke.py`. Every stage time comes from GitHub, not from a stopwatch, so the
same command works live (--wait) and afterwards as evidence.

Stages, each as minutes since the challenge start (--start, default the PR's first commit):
first commit -> PR opened -> required checks green on the final commit -> teammate approval
-> merged -> main CI deploy job finished -> (optional) production smoke passed.

  python scripts/deploy_challenge_timer.py --pr 170 --start 2026-11-02T11:30:00Z --wait --smoke \
      --report .local/deploy-challenge.json
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time

REQUIRED_CHECKS = ("Backend tests", "Frontend lint and build", "Database migrations")
DEPLOY_JOB = "Deploy main after checks"
TARGET_MINUTES = 30
ROOT = Path(__file__).resolve().parents[1]


def gh_api(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True, encoding="utf-8"))


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


def stages(start, pr, commits, check_runs, reviews, deploy_job, smoke_at=None):
    """Pure computation, so it can be tested without GitHub.

    pr: pulls API dict; commits: PR commits; check_runs: check runs on the final head commit;
    reviews: PR reviews; deploy_job: the main run's deploy job (or None); smoke_at: ISO time or None.
    """
    author = pr["user"]["login"]
    head = pr["head"]["sha"]
    first_commit = min((c["commit"]["author"]["date"] for c in commits), default=None)
    required = [r for r in check_runs if r["name"] in REQUIRED_CHECKS]
    green = (len({r["name"] for r in required if r["conclusion"] == "success"}) == len(REQUIRED_CHECKS))
    approvals = [r for r in reviews if r["state"] == "APPROVED" and r["user"]["login"] != author
                 and r.get("commit_id") == head]
    deployed = deploy_job if deploy_job and deploy_job.get("conclusion") == "success" else None

    events = [
        ("first_commit", first_commit),
        ("pr_opened", pr["created_at"]),
        ("checks_green", max(r["completed_at"] for r in required) if green else None),
        ("approved", min(r["submitted_at"] for r in approvals) if approvals else None),
        ("merged", pr.get("merged_at")),
        ("deployed", deployed["completed_at"] if deployed else None),
        ("smoke_passed", smoke_at),
    ]
    start = start or first_commit
    origin = parse_time(start)
    result = {"start": start, "pr": pr["number"], "author": author, "head_sha": head,
              "merge_sha": pr.get("merge_commit_sha") if pr.get("merged_at") else None,
              "approvers": sorted({r["user"]["login"] for r in approvals}), "stages": []}
    for name, at in events:
        result["stages"].append({"stage": name, "at": at,
                                 "minutes_from_start": round((parse_time(at) - origin).total_seconds() / 60, 1)
                                 if at and origin else None})
    finish = smoke_at or (deployed["completed_at"] if deployed else None)
    result["total_minutes"] = (round((parse_time(finish) - origin).total_seconds() / 60, 1)
                               if finish and origin else None)
    result["within_target"] = (result["total_minutes"] is not None
                               and result["total_minutes"] <= TARGET_MINUTES)
    return result


def collect(repo, number):
    pr = gh_api(f"repos/{repo}/pulls/{number}")
    commits = gh_api(f"repos/{repo}/pulls/{number}/commits?per_page=100")
    check_runs = gh_api(f"repos/{repo}/commits/{pr['head']['sha']}/check-runs?per_page=100")["check_runs"]
    reviews = gh_api(f"repos/{repo}/pulls/{number}/reviews?per_page=100")
    deploy_job, main_run = None, None
    if pr.get("merged_at"):
        runs = gh_api(f"repos/{repo}/actions/workflows/ci.yml/runs?head_sha={pr['merge_commit_sha']}"
                      "&event=push&per_page=5")["workflow_runs"]
        if runs:
            main_run = runs[0]
            jobs = gh_api(f"repos/{repo}/actions/runs/{main_run['id']}/jobs?per_page=100")["jobs"]
            deploy_job = next((j for j in jobs if j["name"] == DEPLOY_JOB), None)
    return pr, commits, check_runs, reviews, deploy_job, main_run


def markdown(result, main_run):
    lines = [f"| Stage | Time (UTC) | Minutes from start |", "| --- | --- | --- |"]
    for s in result["stages"]:
        lines.append(f"| {s['stage']} | {s['at'] or 'not reached'} | "
                     f"{'' if s['minutes_from_start'] is None else s['minutes_from_start']} |")
    total = result["total_minutes"]
    lines.append("")
    lines.append(f"PR #{result['pr']} by {result['author']}, approved by "
                 f"{', '.join(result['approvers']) or 'nobody yet'}; main run: "
                 f"{main_run['html_url'] if main_run else 'not started'}.")
    lines.append(f"Total: {'not finished' if total is None else f'{total} min'} "
                 f"(target {TARGET_MINUTES} min: {'met' if result['within_target'] else 'not met'}).")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", default="Ikeee-AI/TekaTech")
    parser.add_argument("--pr", type=int, required=True)
    parser.add_argument("--start", help="challenge start, ISO UTC (default: the PR's first commit)")
    parser.add_argument("--wait", action="store_true", help="poll until the deploy job finishes (max 45 min)")
    parser.add_argument("--smoke", action="store_true", help="run deployed_smoke.py on the merge commit after deploy")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.start and parse_time(args.start).tzinfo is None:
        parser.error("--start needs a time zone, e.g. 2026-11-02T19:30:00+08:00 (Manila) or ...T11:30:00Z")

    deadline = time.monotonic() + 45 * 60
    while True:
        pr, commits, check_runs, reviews, deploy_job, main_run = collect(args.repo, args.pr)
        done = deploy_job is not None and deploy_job.get("status") == "completed"
        if done or not args.wait or time.monotonic() > deadline:
            break
        reached = "merged" if pr.get("merged_at") else "open"
        print(f"{datetime.now(timezone.utc):%H:%M:%S}Z PR #{args.pr} {reached}; waiting for deploy...", flush=True)
        time.sleep(20)

    smoke_at = None
    if args.smoke and deploy_job and deploy_job.get("conclusion") == "success":
        # Read the result from --report, not stdout: deployed_smoke.py prints a line per failed
        # attempt before its JSON, so stdout is not pure JSON after a retry (#170 review).
        with tempfile.TemporaryDirectory() as tmp:
            smoke_report = Path(tmp) / "smoke.json"
            smoke = subprocess.run([sys.executable, str(ROOT / "scripts/deployed_smoke.py"),
                                    "--api-url", "https://tekatech-api.onrender.com",
                                    "--frontend-url", "https://tekatech-web.onrender.com",
                                    "--commit", pr["merge_commit_sha"], "--attempts", "18", "--delay", "10",
                                    "--report", str(smoke_report)],
                                   capture_output=True, text=True, encoding="utf-8")
            if smoke.returncode == 0 and smoke_report.exists():
                checked_at = json.loads(smoke_report.read_text(encoding="utf-8"))["checked_at"]
                smoke_at = checked_at.split(".")[0].removesuffix("+00:00") + "Z"
        if smoke_at is None:
            print("deployed smoke FAILED:\n" + smoke.stdout[-800:], file=sys.stderr)

    result = stages(args.start, pr, commits, check_runs, reviews, deploy_job, smoke_at)
    result["main_run"] = main_run["html_url"] if main_run else None
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(markdown(result, main_run))
    return 0 if result["within_target"] else 1


if __name__ == "__main__":
    sys.exit(main())
