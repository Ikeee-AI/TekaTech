import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("pipeline_metrics", Path(__file__).resolve().parents[2] / "scripts/pipeline_metrics.py")
metrics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metrics)


def run(run_id, event, conclusion, start, end, branch="feature", sha=None):
    return {"id": run_id, "event": event, "status": "completed", "conclusion": conclusion, "head_sha": sha or f"sha{run_id}",
            "head_branch": branch, "run_started_at": start, "updated_at": end, "html_url": f"https://ci/{run_id}"}


def test_summarize_separates_pr_main_cancelled_and_deploy_outcomes():
    runs = [
        run(1, "pull_request", "success", "2026-10-12T00:00:00Z", "2026-10-12T00:01:00Z"),
        run(2, "pull_request", "failure", "2026-10-12T00:00:00Z", "2026-10-12T00:03:00Z"),
        run(3, "pull_request", "cancelled", "2026-10-12T00:00:00Z", "2026-10-12T00:00:10Z"),
        run(4, "push", "success", "2026-10-12T01:00:00Z", "2026-10-12T01:02:00Z", branch="main", sha="merged"),
        run(5, "push", "failure", "2026-10-12T02:00:00Z", "2026-10-12T02:04:00Z", branch="main"),
        run(6, "push", "failure", "2026-10-12T03:00:00Z", "2026-10-12T03:01:00Z", branch="main"),
    ]
    deploy_jobs = {
        4: {"conclusion": "success", "completed_at": "2026-10-12T01:02:00Z"},
        5: {"conclusion": "failure", "completed_at": "2026-10-12T02:04:00Z"},
        6: {"conclusion": "skipped", "completed_at": None},
    }
    result = metrics.summarize(runs, deploy_jobs, {"merged": "2026-10-12T00:59:00Z"})

    assert result["pr_pipeline_avg_min"] == 2.0
    assert result["pr_run_count"] == 2
    assert result["main_run_count"] == 3
    assert (result["success_numerator"], result["success_denominator"]) == (2, 5)
    assert result["cancelled_or_skipped_runs"] == 1
    assert result["production_deploys"] == 1
    assert result["merge_to_live_avg_min"] == 3.0
    assert result["failed_deploys"] == 1
    assert result["ci_failures_on_main"] == ["https://ci/6"]
    assert result["recovery_min"] is None


def test_empty_window_reports_unknown_not_zero():
    result = metrics.summarize([], {}, {})
    row = metrics.markdown_row("Sprint 2", result)
    assert result["success_rate_pct"] is None
    assert result["pr_pipeline_avg_min"] is None
    assert "N/A (0 runs)" in row
