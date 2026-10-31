# Sprint 5 operational pilot plan

Owner: Ikeee-AI (S5-IK, `docs/sprints-2-to-5.md`). Prepared 31 October 2026. This is a plan; results go in the pilot report.

## Window and freeze

- **Observation window:** Wednesday 4 November 12:00 → Friday 6 November 12:00 Manila (48 hours). The sprint plan requires the pilot to start by Wednesday noon, so fixes still fit before Saturday 7 November 15:00.
- **Deploy freeze during the window:** only fixes for critical or high-severity incidents. Each still goes through a reviewed PR and the normal pipeline, and is recorded with its time. Feature work, including the general-knowledge UI (#172), merges before Wednesday 10:00 or after Friday 12:00, never during the window.
- **Revision under test:** whatever production serves at Wednesday 12:00. Record its commit in the report. A fix deployed during the window starts a new segment in the report.

## Before the window (checklist, Ikeee-AI)

- [ ] GitHub Actions running again after the 1 Nov reset, and the minutes left for November checked (incident, 31 Oct).
- [ ] Open PRs gated and merged or deliberately held; production smoke check passed on the final commit.
- [ ] OpenAI balance checked (prepaid, $10 hard cap, auto-reload off). Write down the starting balance.
- [ ] Laptop set not to sleep while plugged in. Start the monitor at 11:55:
      `python scripts/pilot_monitor.py sample --out .local/pilot/samples.jsonl --interval 300 --hours 48`
- [ ] Pilot testers invited, with the [quick-start guide](../quick-start.md). Testers use their own accounts. Test data is labelled "Pilot test".
- [ ] Standup thread for the pilot opened; everyone posts once a day.

## What is measured

| Signal | Source | Notes |
| --- | --- | --- |
| API health and database round trip, deployed commit, frontend shell | `scripts/pilot_monitor.py`, every 5 min (about 576 samples) | Public GETs only; no login, writes or AI calls. Runs on the laptop, not in Actions (minutes). Laptop gaps are reported as coverage gaps, not downtime |
| Cold vs warm response time | Same samples; a first response of 10 s or more counts as a cold start | The free Render API sleeps after about 15 min idle. A 43.5 s cold start was measured on 31 Oct at 18:54 Manila |
| Daily deployed smoke | `ops-health.yml` (08:00 Manila) | Uses Actions minutes; opens an incident issue on failure |
| Application errors | Render logs for `tekatech-api` (5xx lines, request IDs) | Checked twice a day by Ikeee-AI; Manuel investigates |
| AI quality problems | Tester reports, corrections queue, `query_history` | Adrian/Ikeee-AI turn each one into a regression case (S5-AD) |
| AI cost | OpenAI usage page, start vs end | Report the spend for the window |
| Actions minutes | GitHub billing usage page, start vs end | So November doesn't repeat the 31 Oct stop |

## Incidents: severity and routing

| Severity | Example | Response |
| --- | --- | --- |
| Critical | Site or API down for 2+ consecutive samples (10 min) after a warm-up; data loss; a permission bypass | Ikeee-AI starts the incident within 30 min (daytime); roll back with `rollback.yml` if a deploy caused it ([runbook](../deploy-runbook.md#rollback)) |
| High | A core journey broken (ask, compare, specs, corrections, sign-in) | Owner fixes within the window; reviewed PR; deploy allowed during the freeze |
| Medium / low | Wording, layout, slow but working | Logged; fixed after the window |

Route by area: answer behaviour → Adrian (Ikeee-AI covering the prompt for #172); backend, auth, provider, retrieval → Manuel; presentation → Mika; workflows and state → Jopher; hosting and pipeline → Ikeee-AI. Every critical or high incident gets an entry in [incidents.md](incidents.md).

## After the window (by Friday 18:00)

1. `python scripts/pilot_monitor.py summary --samples .local/pilot/samples.jsonl --report docs/evidence/pilot-2026-11-06.json --markdown docs/evidence/pilot-2026-11-06.md`
2. Add to the report: the revision(s) under test, incidents and their recovery times, Render log error counts, OpenAI and Actions spend, and tester findings routed to owners.
3. Acceptance (S5-IK): no unresolved critical or high incident; final deployed revision passes the smoke check; recovery steps executable; a second member demonstrates deploy and rollback with the runbook.
