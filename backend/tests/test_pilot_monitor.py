import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location("pilot_monitor", Path(__file__).resolve().parents[2] / "scripts/pilot_monitor.py")
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)

START = datetime(2026, 11, 4, 4, 0, tzinfo=timezone.utc)


def sample(minute, api=(200, 0.3), web=(200, 0.2), commit="d3f2192"):
    return {"at": (START + timedelta(minutes=minute)).isoformat(timespec="seconds"),
            "api_ready": {"status": api[0], "seconds": api[1], "error": None if api[0] == 200 else "HTTP"},
            "web": {"status": web[0], "seconds": web[1], "error": None},
            "commit": commit}


def test_summary_counts_availability_cold_starts_and_outages():
    samples = [sample(0, api=(200, 48.0)), sample(5), sample(10, api=(503, 0.4)), sample(15, api=(503, 0.5)),
               sample(20), sample(25, commit="aaaaaaa")]
    report = monitor.summarise(samples, 300)
    api = report["api_ready"]
    assert api["up"] == 4 and api["total"] == 6 and api["availability_pct"] == 66.67
    assert api["cold_starts"] == 1 and api["cold_start_max_s"] == 48.0
    assert api["warm_median_s"] == 0.3
    assert api["errors"] == {"HTTP": 2}
    assert report["api_outages"] == [{"from": samples[2]["at"], "to": samples[3]["at"], "samples": 2}]
    assert report["commits_seen"] == ["aaaaaaa", "d3f2192"]


def test_a_monitor_gap_is_coverage_not_downtime():
    report = monitor.summarise([sample(0), sample(5), sample(65), sample(70)], 300)
    assert report["coverage_gaps"] == [{"from": sample(5)["at"], "to": sample(65)["at"], "minutes": 60.0}]
    assert report["api_ready"]["availability_pct"] == 100.0
    assert report["observed_hours"] == 1.17


def test_take_sample_reads_the_commit_and_never_raises_on_errors():
    def fake(url):
        if url.endswith("/version"):
            return {"status": 200, "seconds": 0.1, "body": '{"commit": "d3f21921776f"}', "error": None}
        if url.endswith("/health/ready"):
            return {"status": None, "seconds": 90.0, "body": "", "error": "TimeoutError"}
        return {"status": 200, "seconds": 0.2, "body": "<html>", "error": None}
    result = monitor.take_sample(fetch=fake, now=START)
    assert result["commit"] == "d3f2192"
    assert result["api_ready"] == {"status": None, "seconds": 90.0, "error": "TimeoutError"}
    assert result["at"] == START.isoformat(timespec="seconds")


def test_markdown_states_gaps_and_outages():
    text = monitor.markdown(monitor.summarise([sample(0), sample(5, api=(503, 0.4)), sample(60)], 300))
    assert "| API /health/ready | 2/3 |" in text
    assert "API outages (consecutive failed samples):** 1" in text
    assert "Coverage gaps (monitor not running, not downtime):** 1" in text
    assert monitor.markdown({"samples": 0}).endswith("No samples recorded.\n")
