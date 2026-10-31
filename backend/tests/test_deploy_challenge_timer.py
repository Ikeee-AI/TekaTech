import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("deploy_challenge_timer", Path(__file__).resolve().parents[2] / "scripts/deploy_challenge_timer.py")
timer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(timer)

HEAD = "head-sha"


def pr(merged_at="2026-11-02T11:20:00Z"):
    return {"number": 170, "user": {"login": "meka-moka"}, "head": {"sha": HEAD},
            "created_at": "2026-11-02T11:05:00Z", "merged_at": merged_at, "merge_commit_sha": "merge-sha"}


COMMITS = [{"commit": {"author": {"date": "2026-11-02T11:03:00Z"}}}]
CHECKS = [{"name": name, "conclusion": "success", "completed_at": f"2026-11-02T11:0{i + 6}:00Z"}
          for i, name in enumerate(timer.REQUIRED_CHECKS)]


def review(login, state="APPROVED", commit=HEAD, at="2026-11-02T11:15:00Z"):
    return {"user": {"login": login}, "state": state, "commit_id": commit, "submitted_at": at}


def stage(result, name):
    return next(s for s in result["stages"] if s["stage"] == name)


def test_full_run_within_target_counts_from_start():
    deploy = {"conclusion": "success", "completed_at": "2026-11-02T11:24:00Z"}
    result = timer.stages("2026-11-02T11:00:00Z", pr(), COMMITS, CHECKS, [review("s2100932")], deploy,
                          smoke_at="2026-11-02T11:26:00Z")
    assert stage(result, "checks_green")["minutes_from_start"] == 8.0
    assert stage(result, "approved")["minutes_from_start"] == 15.0
    assert result["total_minutes"] == 26.0
    assert result["within_target"]
    assert result["approvers"] == ["s2100932"]


def test_self_approval_and_stale_approval_do_not_count():
    reviews = [review("meka-moka"), review("s2100932", commit="older-sha")]
    result = timer.stages(None, pr(merged_at=None), COMMITS, CHECKS, reviews, None)
    assert stage(result, "approved")["at"] is None
    assert result["start"] == "2026-11-02T11:03:00Z"
    assert result["total_minutes"] is None and not result["within_target"]


def test_missing_required_check_or_failed_deploy_is_not_reached():
    checks = CHECKS[:2]
    deploy = {"conclusion": "failure", "completed_at": "2026-11-02T11:24:00Z"}
    result = timer.stages("2026-11-02T11:00:00Z", pr(), COMMITS, checks, [review("s2100932")], deploy)
    assert stage(result, "checks_green")["at"] is None
    assert stage(result, "deployed")["at"] is None
    assert not result["within_target"]
