# Sprint 3 work log (19–24 October 2026, due Saturday 24 October, 3:00 PM Asia/Manila)

Written with the `log-work` skill. Facts and evidence only; newest entry at the bottom.

## 2026-10-23 13:17 Asia/Manila — OpenAI credit restored, keys rotated, cited live answer, weekly AI smoke job
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S3-IK (#58, #33) · **Branches:** `tekatech/s3-ik-openai-restored`, `tekatech/s3-ik-live-ai-smoke`

The work ran from 22 Oct, about 18:00, to 23 Oct 00:41. This entry was written on 23 Oct.

**Done**
- **Local OpenAI check (TekaTech-dev):** the real call passed at 18:08 on 22 Oct: `text-embedding-3-small`, 1536 dimensions, 9 tokens, all 7 checks — evidence: `docs/evidence/openai-local-2026-10-22.json` (PR #76).
- **Keys:** moved to separate Restricted keys in the Default project. Production is `TekaTech_Render` in Render; local dev is `TekaTech_Credit`. The old keys `TekaTech` (`MF0A`) and both `TekaTech_Latest` (`3DQA` and `OTIA`) were revoked after the Usage page showed `3DQA` had only 1 embeddings request (9 tokens) — evidence: `docs/evidence/openai-production-2026-10-22.md`.
- **Local check with the new dev key:** passed, request `req_d3a2d0f138644cf9a543d44ed7f26ce9` (local).
- **Production after the key rotation:** the deployed smoke check passed at 22:38. Commit `096f8f2` = main, `/gadgets` = 3, CORS passed — evidence: `.local/deployed-smoke-096f8f2.json` (not committed). Summary is in the evidence file.
- **Live `/query` proved the production key:** at 23:01, a question about a gadget with no specs returned HTTP 200 in 9.2 s (includes a cold start) with the safe "no spec information" answer. Nothing is written to the database on this path.
- **Cited answer on the live site:** at 23:16, the owner added Apple iPhone 15 through the live UI, using spec text from `prompts/eval/sources.json` (source https://support.apple.com/en-us/111831), then indexed it and asked about it. The answer had 5/5 claims supported by the source and 3/3 valid `[1]` citations. One question; this is an acceptance smoke check, not an evaluation score — evidence: `docs/evidence/openai-production-2026-10-22.md`.
- **Spending controls (owner, in the dashboard):** the project is restricted to `text-embedding-3-small` and `gpt-5-mini`. Prepaid balance is $10.00 with auto-reload OFF. Org spend limit is $10/month, with email alerts at $5 and $10.
- **PR #76 opened (evidence and status lines):** README, backlog, environments and incidents updated to match. Commits `564c4b1`, `09aa3c1`, `fb8c613`, `17f817e` — https://github.com/Ikeee-AI/TekaTech/pull/76
- **PR #79 opened (weekly smoke job):** `scripts/ai_smoke.py`, `.github/workflows/ops-ai-smoke.yml` and 8 mocked tests. The backend suite passed locally (111 tests). One real local run passed: embedding 7 tokens; chat `gpt-5-mini-2025-08-07` with 13 prompt and 10 completion tokens, `finish_reason: stop`. Commit `9eb8082` on `tekatech/s3-ik-live-ai-smoke` — https://github.com/Ikeee-AI/TekaTech/pull/79
- **Smoke-job secret:** the GitHub secret `OPENAI_SMOKE_API_KEY` was set at 00:28 on 23 Oct from the `TekaTech_Smoke` key (`W-sA`). The value was piped from the clipboard and never printed.
- **Issues and comments:** opened #77 for Manuel (cap `max_completion_tokens` / `reasoning_effort`) and #78 for Jopher (duplicate `smartphone` / `Smartphone` categories). Commented on #59 with the real spending cap.
- **Review status:** Manuel (`s2302827-byte`) approved #76 at 11:38 and #79 at 11:40 on 23 Oct. All three required checks are green on both PRs' latest commits. Neither is merged yet.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| Auto-mode classifier denied a command that printed the local key's length and last 4 characters ("Credential Materialization") | Printing parts of a key counts as exposing it | Switched to checks that only print yes/no (does the key end with the owner-supplied characters). Resolved |
| Local `.env` check: "ends with GngA: False" | The new key hadn't been pasted or saved yet | The owner re-pasted it in Notepad; the recheck said True. Resolved |
| WebFetch of `platform.openai.com/docs/pricing` returned 301 | The page moved to `developers.openai.com/api/docs/pricing` | Fetched the new URL. Resolved |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| README, `environments.md`, `incidents.md` and `backlog.md` said `credit_balance_exhausted` | The docs were wrong once credit was restored | Corrected in PR #76 — Ikeee-AI — approved, not merged |
| `environments.md` Step 3 planned separate OpenAI projects per environment; we actually use one Default project with separate keys | One shared budget; one environment's usage can use up another's credit | E4 recorded as "partly mitigated" — Ikeee-AI — open |
| The plan said to set a monthly budget, but the dashboard shows the org spend limit as "Limit not enforced" (alerts only) | The $10 limit does not stop requests | The real cap is the $10 prepaid balance with auto-reload off; recorded in the evidence file — Ikeee-AI — resolved |
| Issue #33 says "one small request"; `ai_smoke.py` sends two (embedding and capped chat) | About $0.00002 per run; it covers both models the app uses | Stated in PR #79 — Ikeee-AI — accepted pending review (approved) |
| Plan step "index production specs": production had 3 gadgets and 0 specs | No existing data to index for the cited-answer check | Added one gadget and spec (iPhone 15) from Adrian's verified pack through the UI — Ikeee-AI — done |
| The original key `MF0A` showed "last used 22 Oct" from an unidentified caller before it was revoked | Unknown usage source | Key revoked; no further action — Ikeee-AI — closed |

**Decisions**
- Stay in the Default project with separate keys, rather than separate projects, for Sprint 3 — the owner was already set up there and the deadline is close — Ikeee-AI.
- Set a $10 spend level — the estimate is about $0.005 per question and $3–5 of expected use through 7 Nov; it limits the damage from abuse of the public `/query` — Ikeee-AI.
- Revoke `3DQA` only after checking its usage — revoking can't be undone — Ikeee-AI.
- The smoke job runs Friday 08:30 Manila, is never a required check and assigns failures to Manuel — a provider outage must not block deploys — Ikeee-AI.

**Blockers / risks**
- **Shared $10 prepaid credit:** when it runs out, the live AI stops. #77 caps the cost per answer — Manuel — Sat 24 Oct 3 PM.
- **`POST /query` is public** (#59 still undecided) — Ikeee-AI + Manuel — Sprint 3.
- **No visible Sprint 3 activity from Mika (#55) or Jopher (#57)** as of 23 Oct 13:17: no branches, PRs, issue comments or standups on #72. Both have repo access. Merge cutoff is Sat 10 AM — Ikeee-AI to follow up — today.
- **GitHub reports 3 Dependabot vulnerabilities on main** (1 high, 2 moderate) — Ikeee-AI — run `security-scan`.
- **All OpenAI keys expire 21 Dec 2026** (after the project ends) — Ikeee-AI — record in the handover.

**Plan alignment**
- **S3-IK:** Partial.
  - Hosted frontend → API → real OpenAI → cited answer: verified live, but the evidence PR #76 is approved and not merged.
  - #33 smoke job: approved and green, not merged.
  - Not started: #32 prompt-eval CI, #34 staging, #31 measured optimization (caching PR #73 is still open), and a warm/cold latency baseline (only one cold sample).
- **Other owners, observed on GitHub at 13:17 (not their own status reports):**
  - **Manuel (S3-MA):** PRs #75, #83, #84 open; standup posted on #72.
  - **Adrian (S3-AD):** PRs #74, #80, #81, #82 open.
  - **Mika (S3-MI):** nothing yet.
  - **Jopher (S3-JO):** nothing yet.

**Next**
- Merge #76 and #79, then dispatch `ops-ai-smoke.yml` once and record the run — Ikeee-AI — 23 Oct.
- Send Manuel and Adrian the team message, and the dev key privately — Ikeee-AI — 23 Oct.
- Follow up with Mika and Jopher on #55 and #57 — Ikeee-AI — 23 Oct.
- Run `security-scan` on the Dependabot alerts — Ikeee-AI — 23 Oct.

## 2026-10-23 13:30 Asia/Manila — On-time check against the internal Sprint 3 deadlines
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S3-IK (board coordination) · **Branch:** `tekatech/s3-ik-worklog`

Deadlines are the ones posted on #62 and #54–#58 at Thu 22 Oct 00:17. Times come from GitHub timestamps converted to Manila time. "Late" means after the deadline, measured to the minute. This is an observation of GitHub only. Work that hasn't been pushed or posted can't be seen.

**Done**
- Compared each owner's issue comments, #72 standups and PR creation times with the deadlines — evidence: issues #54–#58 and #72, PRs #73–#84.

| Deadline (Manila) | Adrian | Manuel | Mika | Jopher | Ikeee-AI |
| --- | --- | --- | --- | --- | --- |
| Plan on own issue, Thu 09:00 | Late: Thu 19:49 on #54 (he says so himself) | Late: Thu 21:12 on #56 | Missed: none on #55 | Missed: none on #57 | On time: plan and schedule posted Thu 00:24 on #62 |
| Handoff, Thu 12:00 | Late: missed (acknowledged on #54); prompt status given on #56 Fri 08:14 | Late: error contract in the #56 plan, Thu 21:12 | Missed: no UI-state list to Jopher | — (receives) | — |
| First PR, Thu 21:00 | On time: #74 Thu 19:46 | Late by 36 min: #75 Thu 21:36 | Missed | Missed | On time: #73 Thu 00:31 |
| All PRs open, Fri 12:00 | On time: #80 08:52, #81 09:33, #82 09:46 | Slightly late: #83 12:05, #84 12:16 | Missed | Missed | On time: #76 Thu 23:52, #79 Thu 23:56 (#32 and #34 not started) |
| Daily standup before 09:00 in #72 (Thu, Fri) | Missed both | Thu missed; Fri late (11:35) | Missed both | Missed both | Missed both |
| Reviews requested of them | — | Approved #76 and #79 on Fri 11:38 / 11:40 | — | #75 waiting for review; Manuel pinged 11:30; no response by 13:30 | #75 not reviewed (Manuel asked for any reviewer on #56) |
| Reviewed + merged, Fri 21:00 | Pending | Pending | Pending | Pending | Pending |

**Errors and fixes** — None.

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Manuel's revised times on #56 (PR B by Fri 21:00, PR C by Sat 08:00) vs actual: he opened both by Fri 12:16 | His proposed slip wasn't needed | None needed — Manuel — closed |
| #75 needs a review from Jopher (per the review table), but Jopher has shown no activity | #83, #84 and #77 depend on #75; the cost cap (#77) protects the $10 credit | Another reviewer needed — Ikeee-AI to decide — open |

**Decisions** — None yet. Manuel's merge-order proposal on #56 (#74 → #81 → #80 → #82, then #73/#76/#79) is waiting for Ikeee-AI's answer.

**Blockers / risks**
- **Mika (#55) and Jopher (#57) have missed every milestone so far.** With the Sat 10:00 merge cutoff, their S3 rows are at risk of Not started — Ikeee-AI to follow up — today.
- **Nobody posted standups on time, including Ikeee-AI.**

**Plan alignment** — Pace so far: on track — Adrian (late start, PRs on time); slightly late — Manuel; no visible start — Mika and Jopher. None of them is Done yet (nothing merged).

**Next** — Answer Manuel on #56 (merge order, #75 reviewer) and message Mika and Jopher — Ikeee-AI — today.

## 2026-10-23 14:00 Asia/Manila — Merges, deploy, first smoke run failure and fix
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S3-IK (#58, #33) · **Branches:** main, `tekatech/s3-ik-smoke-key-hardening`

**Done**
- **Gate and merges:** all 7 PRs in Manuel's order (from #56) passed `pr-gate`: approval on the head commit and the three required checks green. Branch protection is not enforced on this repo, so the gate is manual. Before merging, I combined all 7 locally: the only conflict was `prompts/README.md` between #74 and #80, and with it resolved the backend suite passed (134, local).
- **Merged (squash):** #74 (`d562843`), #82 (`a0ef344`), #73 (`8fd96be`), #76 (`0a8337a`), #79 (`4818f01`), each pinned to its approved head commit.
- **Main pipeline:** run [39905853931](https://github.com/Ikeee-AI/TekaTech/actions/runs/39905853931) on `4818f01`: all jobs and the deploy succeeded. The runs for `0a8337a`, `8fd96be` and `a0ef344` were cancelled because the merges were back to back (same concurrency group).
- **Production:** deployed smoke passed at 13:32 on `4818f01`: `/gadgets` = 4, CORS passed, first attempt.
- **Comments posted:** answered Manuel on #56 (merge order, #75 reviewer); asked Adrian on #81 and #80 to resolve conflicts; check-ins for Mika on #55 and Jopher on #57 (push draft PRs by 18:00).
- **#75 pre-review:** an AI pre-review for Ikeee-AI's review (not a peer review) suggested approving after a rebase, with follow-ups on timeout wording and logging.
- **Smoke-job fix:** PR #86 opened. The workflow dispatched from that branch passed with the existing secret — run [39906477281](https://github.com/Ikeee-AI/TekaTech/actions/runs/39906477281).

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| #81 `mergeable=CONFLICTING` after #74 was merged; #80 conflicts in `prompts/README.md` | #81 was based on #74's branch, and #74 was squash-merged; #74 and #80 edit the same README section | Asked Adrian to merge `main` and resolve; Manuel to re-approve — open |
| First smoke run on main ([39906303772](https://github.com/Ikeee-AI/TekaTech/actions/runs/39906303772)): both checks `UnicodeEncodeError` in 13 ms; it opened #85 for Manuel | An invisible non-ASCII character in the secret, added while piping from the clipboard (Ikeee-AI's setup step) | #85 reassigned to Ikeee-AI with an explanation; key cleaning in PR #86, verified by the branch run — open until a passing run on main |
| A new test failed (`Regex pattern did not match` for `U+00E9`), but the commit was still pushed | `+` is a regex quantifier; my command chain didn't stop on the test failure | Pattern escaped in `1f2ea96`; reran with pipefail: 127 passed (local) — resolved |

**Conflicts and contradictions** — None new.

**Decisions** — Merge Manuel's order, skipping the conflicting #81/#80 — Ikeee-AI. Ikeee-AI reviews #75 in place of Jopher — Ikeee-AI.

**Blockers / risks** — #81 and #80 need Adrian before the Sat 10:00 cutoff. #75 is waiting for Ikeee-AI's review and Manuel's rebase.

**Plan alignment** — **S3-IK:** cited answer on the live site, its evidence (#76) and the smoke job (#79) are merged and deployed; #79 is verified via the branch run, but not yet on main. Still Partial: #32, #34 and #31 are not started.

**Next**
- Merge #86 after review, dispatch the smoke job on main, then close #85 — Ikeee-AI — today.
- Review #75 — Ikeee-AI — today.

## 2026-10-23 15:40 Asia/Manila — #75, #81 and #80 merged; Jopher's #91; retrieval issue #88
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S3-IK (#58, board coordination) · **Branch:** main

**Done**
- **#75 (Manuel):**
  - Ikeee-AI's review comment came at 13:31. Manuel updated from main and fixed the timeout wording at 13:40. Ikeee-AI approved on `5e1d976`.
  - Squash-merged as `6b613fd`. Main run [39908877286](https://github.com/Ikeee-AI/TekaTech/actions/runs/39908877286) succeeded and deployed; deployed smoke passed.
  - Live follow-up comment posted on #75: a broad iPhone 15 question gave a cited `gpt-5-mini` answer in 11.3 s.
- **#88 opened for Manuel (retrieval threshold):**
  - A narrow question returned "no spec information" on live. Measured with the dev key, it scores 0.459 against the single 425-character chunk, below `MATCH_THRESHOLD = 0.5`.
  - Other ordinary questions scored 0.518 and 0.522; the broad one scored 0.559, matching the live 0.56.
- **#81 and #80 (Adrian):**
  - Adrian resolved the conflicts at 14:01 and 14:22, and Manuel re-approved both on the new heads.
  - Before merging, I tested them together with main locally: they merge cleanly and 155 tests pass.
  - Merged as `ea44247` (#81) and `f450b2c` (#80). Main run [39917503414](https://github.com/Ikeee-AI/TekaTech/actions/runs/39917503414) succeeded and deployed; deployed smoke passed on `f450b2c` (`/gadgets` = 4, CORS passed).
- **Reviewers:** Adrian added on #83 and #84 at Manuel's request. Stacking advice posted on #75.
- **Jopher (S3-JO):**
  - First Sprint 3 activity at 14:56: PR #91, opened from his fork. At 14:58 he commented on #57 that all S3-JO scope is done and verified on TekaTech-dev; all 3 checks are green.
  - The screenshots I sampled have the email covered (0.6 MB total).
- **#91 pre-review for Ikeee-AI** (AI, not peer review) suggests **Request changes**:
  - `GadgetForm.jsx:64` calls `friendlyError(err)` and discards the result, so a failed gadget create or edit shows no error. Confirmed by reading the code.
  - Screenshot 11 predates #75's 503 message.
  - The automated failure-drill check from the S3-JO acceptance is missing.
  - Minor: a compare URL with a malformed id dead-ends; the single-gadget panel goes stale after adding a spec; whitespace.

**Errors and fixes** — None new.

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #91 is from a fork; the kickoff (#62) asked for branches in this repo | Labeler and reviewer workflows run in fork mode | Note to Jopher — Ikeee-AI — open |
| #91 edits presentation components (S3-MI, Mika's area) while Mika is absent | Shared-file ownership | Recorded; Mika to look if she returns — Ikeee-AI — open |

**Decisions** — Ikeee-AI reviews #91 because Manuel has four reviews queued — Ikeee-AI.

**Blockers / risks**
- Mika: no Sprint 3 activity as of 15:40 — Ikeee-AI — the 18:00 check.
- Narrow questions miss on live (#88) — Manuel.
- The cost cap (#77) is still open — Manuel.

**Plan alignment**
- **Jopher:** first PR about 18 h after the Thu 21:00 deadline, and 2 h 56 min after the Fri 12:00 "all PRs" deadline. Full scope submitted before the Sat 10:00 cutoff; not Done until merged.
- **Adrian:** #74, #81, #80 and #82 merged and deployed.
- **Manuel:** #75 merged; #83 and #84 open.

**Next**
- Ikeee-AI reviews #91, requesting the `GadgetForm` fix — today.
- Check on Mika at 18:00 — Ikeee-AI.
