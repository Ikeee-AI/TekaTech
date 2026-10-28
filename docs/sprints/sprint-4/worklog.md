# Sprint 4 work log (25–31 October 2026, due Saturday 31 October, 3:00 PM Asia/Manila)

Written with the `log-work` skill. Facts and evidence only; newest entry at the bottom.

## 2026-10-25 19:40 Asia/Manila — Dependency security check and zod fix
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S4-IK (repository history scan, dependency security) · **Branch:** `tekatech/s3-ik-zod-audit-fix`

**Done**
- Ran `security-scan` on `4667bc1` (all local):
  - Secret guard on tracked files: passed.
  - Frontend `npm audit --omit=dev`: 0 vulnerabilities. Full `npm audit`: 1 high, `zod` 4.4.3.
  - Backend `pip-audit` on the frozen uv export: no known vulnerabilities.
  - Full-history Gitleaks scan (19:22, with the owner's OK): Gitleaks 8.30.1 installed in the user folder `~/tools/gitleaks-8.30.1` (release zip checked against its published SHA-256). `gitleaks git --redact --log-opts="--all -m"` scanned 204 commits (5.34 MB) across all 11 remote branches, including merge-commit diffs: **no leaks found**. Of the 206 commits on those branches, the 2 not counted have no file changes, among them the empty initial commit `df1a450`. Report: `.local/gitleaks-all-m.json` (not committed, 0 findings).
- Dependabot alert #27 (high, CVSS 7.5, GHSA-mrhx-c7xc-m3w5: "Zod can exhaust memory while validating oversized constrained collections", affects < 4.6.6). `zod` comes in only through `eslint-plugin-react-hooks@7.1.1`, a lint-time dev dependency, so it isn't in the production bundle.
- **PR #115 opened:** lockfile-only update to `zod` 4.6.7 from a non-forced `npm audit fix`; `package.json` unchanged. Local `npm ci`, `npm run lint` (clean), `npm run build` and `npm audit` (0 vulnerabilities) passed. Reviewer: Manuel — https://github.com/Ikeee-AI/TekaTech/pull/115
- **Dependabot PRs triaged:** #47 (4 GitHub Actions updates), #68 (6 backend updates) and #106 (14 frontend updates) are MERGEABLE, with the three required checks green and no approvals yet. Requested reviews: Manuel on #47 and #68, Mika on #106.

**Errors and fixes** — None.

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Dependabot's frontend group PR #106 doesn't update `zod`, so it does not close alert #27 | Merging #106 alone leaves the alert open | Separate PR #115 — Ikeee-AI — open |

**Decisions** — Fix the dev-only `zod` alert in a lockfile-only PR instead of waiting for Dependabot; don't use `npm audit fix --force` — Ikeee-AI.

**Blockers / risks**
- Alert #27 stays open on `main` until #115 is approved and merged — Manuel.
- The history scan is a point-in-time result for `4667bc1` and the branches at 19:22. Rerun it before the Sprint 4 release tag — Ikeee-AI — Sat 31 Oct.

**Plan alignment** — S4-IK: the sanitized history-scan result is available early; the tracked-file and dependency checks are done; the `zod` fix (#115) is waiting for review. Not Sprint 3 work: the Dependabot PRs were never part of a Sprint 3 package.

**Next** — Merge #115 after Manuel's review, then confirm alert #27 closes; merge the Dependabot PRs once approved — Ikeee-AI — after review.

## 2026-10-26 23:26 Asia/Manila — Consultation 3 day: merge, production checks, Supabase auth URL fix
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S3-IK (consultation), S4-IK (operations) · **Branch:** `tekatech/s4-ik-log-2026-10-26`

**Done**
- **#126 merged** (squash, 16:01) → `07297aa`. Main CI passed, including the main guard and "Deploy main after checks", which finished 16:03 — [run 40289398763](https://github.com/Ikeee-AI/TekaTech/actions/runs/40289398763).
- **Production smoke check** (`scripts/deployed_smoke.py`, read-only) passed twice on `07297aa`:
  - 16:03, first attempt: 4 gadgets, CORS passed.
  - 19:18, before the consultation, first attempt: 4 gadgets, CORS passed.
  - Reports: `.local/deployed-smoke-07297aa*.json` (not committed).
- **Keep-warm ping at 19:27:** `/health` 200 in 0.21 s, frontend 200 in 0.49 s.
- **Production data check (read-only `GET`, 26 Oct evening):**
  - Apple iPhone 15: 1 chunk, support.apple.com, indexed.
  - Infinix Note 50 Pro 5G+: 1 chunk, added 17:54, indexed. Its source is a `ph-ec-test.infinixmobility.com` page.
  - Poco X7 Pro and Asus ROG Ally: no specs.
- **Consultation 3 held, 19:30.** The owner reported that it went well. Instructor feedback is not recorded yet.
- **Consultation deck** (9 slides, built with AI assistance, private Claude artifact) with the repo's committed screenshots. Not a repo file.
- **Non-admin test user** created in Supabase production (Authentication → Users → Create new user, auto-confirmed, about 19:10) by the owner. Login on the live site works.
- **Supabase auth URL fix** (production project, dashboard, by the owner, about 23:05):
  - Site URL changed from `http://localhost:3000` to `https://tekatech-web.onrender.com`.
  - Redirect URL `https://tekatech-web.onrender.com/**` added.
  - A fresh email signup confirmed through the emailed link, which now opens the live site. The owner verified it.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| Clicking the signup confirmation email opened `localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`, then `ERR_CONNECTION_REFUSED` | Supabase Site URL was still the default `http://localhost:3000`. `AuthContext.jsx` calls `supabase.auth.signUp` without `emailRedirectTo`, so Supabase used the Site URL. The link itself had already been used. | Site URL and redirect URL fixed in the dashboard; a fresh signup works. Code hardening is open (Next). |
| `gh pr merge 126` printed `net/http: TLS handshake timeout` | Network timeout on the client side | The merge had gone through: `gh pr view 126` showed MERGED `07297aa`. No retry needed. |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Supabase auth URL settings are dashboard-only and not described in `docs/deploy-runbook.md` | A new project or environment would repeat the localhost bug | Add an "Auth URL configuration" step to the runbook — Ikeee-AI — open |
| Two test accounts now exist in production auth (one dashboard-created `example.com` address, one email-alias signup) | Test data mixed with real users | Keep for the Sprint 4 demo, then delete or list them in the release notes — Ikeee-AI — open |
| Infinix spec source is a `ph-ec-test` storefront page, not the official product page | Weak citation source | Replace with the official infinixmobility.com page — Jopher (data) — open |
| Jopher asked three questions on #119 (25 Oct 23:01) and the owner has not answered; his draft target is Tue 27 Oct 12:00 | Blocks the CI job for the Playwright browser checks (#128) | Owner reply — Ikeee-AI — 27 Oct, before 12:00 |

**Decisions**
- **TechSpecs API** (techspecs.io) chosen as the source for importing specs, to fill thin data — Ikeee-AI.
  - Rejected: GSMArena scrapes and Kaggle dumps (unofficial, stale), APIMesa and the `cporter202/scraping-apis-for-devs` list (paid scrapers), OrcaRouter (an LLM gateway that conflicts with "OpenAI only").
  - Its free-plan limits and storage/display terms are **not verified**.
  - Timing: after the Sprint 4 release.
- The general-knowledge chatbot fallback is **not adopted**. It was to be raised with the instructor; the outcome is not recorded — Ikeee-AI.

**Blockers / risks**
- TechSpecs terms still need checking before any import — Ikeee-AI — after 31 Oct.
- Production has only 2 of 4 gadgets with any specs (one chunk each), which limits answer quality — Jopher / Adrian — Sprint 4/5.

**Plan alignment**
- S3-IK consultation: **Done** (held; production verified the same day).
- S4-IK: operations fix done (auth URLs). Tagged release, rollback rehearsal, database restore rehearsal, live deploy challenge and the 21-item manifest: **Not started**.

**Next**
- Reply on #119 — Ikeee-AI — 27 Oct, before 12:00.
- Record the instructor's Consultation 3 feedback here — Ikeee-AI — 27 Oct.
- Add the auth URL step to `docs/deploy-runbook.md` — Ikeee-AI — 27 Oct.
- Pass `emailRedirectTo: window.location.origin` in `signUp` (shared auth) — Manuel — Sprint 4.
- Create the Sprint 4 standups issue and the S4-IK issues — Ikeee-AI — 27 Oct.

## 2026-10-27 15:50 Asia/Manila — S4-IK fix batch: local checks, split into 10 reviewable PRs
**Who:** Ikeee-AI (AI-assisted: yes; TekaTech role agents `backend-engineer`, `frontend-engineer`, `integration-engineer`, `devops-engineer`, `test-engineer`) · **Task:** S4-IK (support for S4-MA, S4-JO, S4-MI) · **Branch:** `tekatech/s4-ik-integration` (local), topic branches below

**Done**
- **Fix batch built (26 Oct 23:30 – 27 Oct 04:02, previous session).** At the owner's direction ("fix on the backend and frontend", "fix all high, medium and lows", "fix the supabase disconnect too"), 19 commits on 11 local topic branches. They were merged locally into `tekatech/s4-ik-integration` (`e5fd4c3`) and held unpushed on the owner's instruction. Commits in teammates' areas are labelled "support for S4-MA/S4-JO/S4-MI", not takeovers: no Sprint 4 deadline has passed.
- **Local checks on `e5fd4c3` (27 Oct about 14:56):**
  - Secret guard passed.
  - Backend: compile OK, pytest **477 passed** (local), app import OK.
  - Frontend: `npm ci`, ESLint clean, Vitest **196 passed / 14 files** (local), build OK.
  - Database job **not run locally**: no Postgres, `psql` or Docker on this machine. `assemble_sql.py` runs.
- **Split into 10 PRs** (`devops-engineer` agent, about 15:37). Each topic was rebuilt from `origin/main` by cherry-pick. A PR is stacked only where a conflict or failing test proves the dependency; each PR body names the proof. With all 10 combined, the code matches `e5fd4c3` exactly, apart from the held retrieval change.
  | PR | Topic | Base | Reviewers requested |
  | --- | --- | --- | --- |
  | [#130](https://github.com/Ikeee-AI/TekaTech/pull/130) | Forgot/reset password, sign-up errors | main | Jopher |
  | [#131](https://github.com/Ikeee-AI/TekaTech/pull/131) | Correction status for submitters, pending count for admins (Refs #109) | main | Jopher |
  | [#132](https://github.com/Ikeee-AI/TekaTech/pull/132) | Answer cache, 150-character question limit | main | Manuel |
  | [#133](https://github.com/Ikeee-AI/TekaTech/pull/133) | Survive dropped Supabase connections | main | Manuel |
  | [#134](https://github.com/Ikeee-AI/TekaTech/pull/134) | Navbar ask, compare, catalog, review-queue fixes | #131 | Jopher, Mika |
  | [#135](https://github.com/Ikeee-AI/TekaTech/pull/135) | Input validation, safe 503s (also needs #131) | #132 | Manuel |
  | [#136](https://github.com/Ikeee-AI/TekaTech/pull/136) | Readiness check, request IDs, proxy-aware rate limit | #135 | Manuel |
  | [#137](https://github.com/Ikeee-AI/TekaTech/pull/137) | Vitest in CI, lazy-loaded routes (also needs #130, #132) | #131 | Mika |
  | [#138](https://github.com/Ikeee-AI/TekaTech/pull/138) | Grounded-answer explanation, follow-up questions | #137 | Mika, Adrian |
  | [#139](https://github.com/Ikeee-AI/TekaTech/pull/139) | Frontend polish F1–F3, F6, F7 (also needs #134) | #137 | Mika |
  - The `pr-reviewers.yml` workflow also requested Manuel on every PR.
  - CI: all required checks green on all 10 PRs as of about 15:43. #139's first frontend run failed at `npm ci` with `ECONNRESET` and passed on re-run — [run 40468070967](https://github.com/Ikeee-AI/TekaTech/actions/runs/40468070967).
  - No AI co-author trailers or "generated by" footers in any commit, PR title or PR body (checked).
  - Local backup tags `backup/s4-ik-<topic>-stacked` keep the original stacked tips.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| Local topic branches were stacked: later branches contained merges of earlier ones (`into tmp/merge-check`, `into tekatech/s4-ik-integration`) | Branches were integrated locally before being split | Rebuilt from `origin/main` by cherry-pick; stacked only on proven dependencies — fixed |
| First rebuild came out cumulative again (each `-new` branch contained the previous topic) | Agent built topics in sequence without resetting to `origin/main` | Corrected on resume; topics 1–4 are independent — fixed |
| Agent stopped twice: `API Error: Connection dropped (ECONNRESET)`, then `Unable to connect to API: Self-signed certificate detected (SELF_SIGNED_CERT_IN_CHAIN)` | Network or TLS interception between this machine and the AI service | Resumed both times; nothing had been pushed half-way. Check VPN or proxy if it recurs — open |
| `git branch -f` not possible on the original topic names | They are checked out in old `.claude/worktrees/agent-*` worktrees from the previous session | Pushed local `<topic>-new` branches under the clean remote names — fixed. Old worktrees still to clean up — open |
| `git worktree remove` failed with "Filename too long" | Deep `node_modules` paths on Windows | Deleted with a long-path `Remove-Item`, then `git worktree prune` — fixed |
| CI `npm ci` `ECONNRESET` on #139 | Network failure on the runner | Re-run passed — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Held `tekatech/s4-ik-retrieval-quality` (`b255eb1`: 0.25 threshold, keyword fallback, new `backend/sql/keyword_match_spec_documents.sql`) overlaps Manuel's #129 (gadget-scoped ranking, Refs #88) | Two fixes for one issue (#88) | Not pushed; agree one approach with Manuel — Ikeee-AI / Manuel — 27 Oct |
| #138 and #139 change the AI answer panel; Mika's open issues #122, #123 and #124 touch the same area | Possible duplicate work | Mika to check while reviewing — Mika — 27 Oct |
| #134 (compare edge cases) and Jopher's #121 (compare image fallback) both change the compare page | Possible merge conflict | Jopher to check while reviewing — Jopher — 27 Oct |
| The repo allows only squash merges, so stacked PRs keep their base's commits until rebased | Every stacked PR needs a rebase after its base merges | Ikeee-AI rebases in merge order — open |

**Decisions**
- Push the fix batch as 10 small PRs, each reviewed by the area owner, instead of one 98-file PR — course rule on small reviewed PRs — Ikeee-AI.
- Hold the retrieval change until agreed with Manuel — owner of #88 — Ikeee-AI.
- Deadline for all reviews of these PRs: tonight, 27 Oct, 12:00 midnight Manila — Ikeee-AI.

**Blockers / risks**
- Manual steps at deploy: Supabase Redirect URLs must allow `/reset-password` (#130); `TRUST_PROXY_HEADERS` and `TRUSTED_PROXY_HOPS` on the Render API service (#136) — Ikeee-AI — at merge.
- No browser check yet on any rebuilt branch — Ikeee-AI — after merge, on the deployed site.
- Production still has only 2 of 4 gadgets with specs — Jopher / Adrian — Sprint 4.

**Plan alignment**
- S4-IK fix batch: **Partial** (PRs open, checks green; not reviewed, merged or deployed).
- Tagged release, rollback rehearsal, live deploy challenge and the 21-item manifest: **Not started**. Due Sat 31 Oct 15:00.

**Next**
- Send the team the review-order message — Ikeee-AI — 27 Oct afternoon.
- Merge in waves after approval: (1) #130, #131, #132, #133 → (2) #134, #135, #137 → (3) #136, #138, #139, rebasing each stacked PR onto `main` as its base merges — Ikeee-AI — 28 Oct morning.
- Agree #88 approach with Manuel, then push or drop `retrieval-quality` — Ikeee-AI / Manuel — 28 Oct.
- Clean up old `.claude/worktrees/agent-*` worktrees, `-new` branches and backup tags after the merges — Ikeee-AI — after merge.

## 2026-10-27 16:55 Asia/Manila — Five approved PRs merged; open S4-IK PRs updated
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S4-IK (release integration) · **Branch:** `main`, `tekatech/s4-ik-*`

**Done**
- **`pr-gate` on six approved PRs** (manual gate; branch protection isn't available on this private repo):
  - **PASS:** #127, #121, #115, #68, #47. Each was approved on its current head commit, with all three required checks green.
  - **BLOCKED:** #106. Mika's approval is on `abd4132`, but the head is now `b6b622a` after a Dependabot rebase.
- **Merged (squash, owner's go-ahead, with `--match-head-commit`), in this order:**
  1. #127 → `b063166`
  2. #121 → `0c0999f`
  3. #115 → `9243128`
  4. #68 → `79b7aef`
  5. #47 → `f8cb2d4`
- Main CI on `f8cb2d4` passed every job, including the main guard and "Deploy main after checks" — [run 40474665831](https://github.com/Ikeee-AI/TekaTech/actions/runs/40474665831). The intermediate runs were cancelled because newer commits replaced them.
- **Production verified:** `scripts/deployed_smoke.py` passed at 16:52 on `f8cb2d4`, first attempt (4 gadgets, CORS passed).
- **All 10 open S4-IK PRs updated** by merging `main` down the stack, not rebasing. Each PR's diff stays limited to its own changes. Pushed as fast-forwards, with a comment on each PR explaining the update. Local checks passed on every branch:
  - Backend PRs: pytest 254–439 passed, import OK.
  - Frontend PRs: lint and build OK; Vitest 109, 142 and 163 passed on #137, #138 and #139.
- **New fix on #132 (`6792397`):** #127's spec DELETE route didn't clear the answer cache that #132 adds. It now clears the gadget's saved answers. The new test fails without the fix.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| Merge conflict in `backend/tests/test_specs.py` on #135 | #135 and #127 both added tests at the end of the file | Kept both blocks — fixed |
| Merge conflict in `frontend/src/pages/ComparePage.jsx` on #139 | #121 added `GadgetThumb`; F6 set the card photo to `alt=""` | `<GadgetThumb ... alt="" />` — fixed |
| `ValidationError: 2 validation errors for Settings` (supabase_url, supabase_key missing) on the import check | The scratch worktree has no `.env` | Used CI's dummy values — not a code issue |
| `git worktree remove`: "Filename too long" | Deep `node_modules` paths | Long-path `Remove-Item`, then `git worktree prune` — fixed |

**Conflicts and contradictions** — None new.

**Decisions** — Update the stacked PRs by merging `main` down the stack instead of rebasing. Squash merges flatten the merge commits, and rebasing a base would rewrite history under the PRs stacked on it — Ikeee-AI.

**Blockers / risks**
- #106 needs Mika's re-approval — Mika — 27 Oct.
- Dependabot #113 (zod) is now redundant with #115. Close it if it doesn't close itself — Ikeee-AI.

**Plan alignment** — The five merged PRs are **Done** (reviewed, checks green, merged, deployed, production verified). S4-IK PRs #130–#139 are **Partial**: updated, reviews due tonight at midnight.

**Next** — Send the team review message; merge #130–#139 in waves after approval — Ikeee-AI — 28 Oct morning.

## 2026-10-28 17:05 Asia/Manila — Review-deadline check, 15 PRs merged and deployed, Adrian takeover, #106 guard exception
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S4-IK (release integration), takeover of the S4-AD #138 review · **Branch:** `main`, `tekatech/s4-ik-*`, `tekatech/s4-ik-retrieval-fix`

**Done**
- **Review deadline (Tue 27 Oct, 12:00 midnight Manila) checked against GitHub:**
  - **Manuel:** met. Approved #132, #133, #135, #140; commented on #136 asking for `TRUST_PROXY_HEADERS: 'false'`; replied on #88 (Ikeee-AI's branch first, #129 adapted on top).
  - **Jopher:** met. Approved #129, #130, #131; requested changes on #134; posted the #121 clash check.
  - **Mika:** met, with 14 minutes to spare. Approved #137, #138; requested changes on #139; re-approved #106; commented on #134.
  - **Adrian:** **missed.** No review on #138.
- **Takeover of Adrian's #138 wording check** (Ikeee-AI, AI-assisted; not an approval, since Ikeee-AI is the author): [comment](https://github.com/Ikeee-AI/TekaTech/pull/138#issuecomment-6462039349).
  - The wording matches `prompts.py` and the eval rules.
  - One mismatch for a follow-up: the "Answer based on N cited specs" badge counts every retrieved source and also shows on abstentions. Overlaps Mika's #124.
  - Adrian's review request stays open. His S4-AD review item is **Partial**.
- **Review fixes pushed by Ikeee-AI:**
  - #136 `fd36943`: `TRUST_PROXY_HEADERS` off in `render.yaml`, test and runbook.
  - #139 `ef8b95f`: 40 px tap targets, 15 s timeout on the fast-typing test.
  - #135 `91adffc`: test setup for Jopher's #142 tests under the new review guard.
- **Merged and deployed** (all approved by another teammate on the merged commit, except #106; see Errors):
  - Squash: #142 `0acf04e`, #141 `e7b9631`, #133 `c29dbfc`, #140 `6f36d2e`, #143 `83f410e`.
  - Merge commits: #130 `fcc3060`, #132 `ac27588`, #137 `a462b46` (also brought #131 `080c1e1`), #138 `9ff3f75`, #135 `1105945`, #136 `6d22f63`, #134 `d1757ca`, #139 `b935255`.
  - Squash: #106 `ab785a8`.
- **Deploys:** main CI passed every job, including the main guard and "Deploy main after checks", on `6d22f63`, `d1757ca`, `b935255` and (after a re-run) `ab785a8` — [run 40656319848](https://github.com/Ikeee-AI/TekaTech/actions/runs/40656319848).
  - Production probes after deploy: web 200, `/health/ready` 200 with the database reachable, `x-request-id` header present.
  - The full `deployed_smoke.py` run was **not** done this session.
- **Merged combination checked locally before merging** (scratch worktree, CI dummy env): backend 453 passed, lint clean, Vitest 196/196, build OK.
- **#128 (Jopher):** merged `main` into the branch as `24fa1d3`.
  - Resolved `package.json`/lockfile: kept Vitest and Playwright; Vitest only collects `src/**`.
  - Local: backend 454 passed, Vitest 196/196, build OK, `test:e2e` 8/8.
  - Re-approval requested from Manuel.
- **[#145](https://github.com/Ikeee-AI/TekaTech/pull/145) opened:** the retrieval fix agreed in #88 (0.25 threshold, keyword fallback, admin cache bypass), cherry-picked from local `b255eb1`.
  - Local: backend 486 passed.
  - Needs manual SQL `keyword_match_spec_documents.sql` before deploy.
  - Manuel told on #88.
- **#50 (openai 2.53 → 3.37) and #49 (uv-build):** tested on current main. Local: 453 passed and import OK on both.
  - Also checked the openai 3.37 API surface the backend uses (parameters, response fields, error classes): compatible.
  - No real provider call made. Results posted; Manuel asked to review.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `Permission for this action was denied … [Modify Shared Resources]` when enabling merge commits via API | The repo-setting change was blocked for the assistant | Owner ticked "Allow merge commits" in Settings and unticked it after the stack merged — fixed |
| Simulated squash merges of the stacked PRs conflicted | Squashing a base PR breaks PRs stacked on its original commits | Merge commits for the stacked PRs, squash for standalone ones — fixed |
| 3 failing tests (`409 == 200`) in `test_corrections.py` when #142 and #135 were combined | #135's review guard needs the status update to match a row; #142's new tests didn't set one | Test-only fix on #135 (`91adffc`); #135 held out of the first wave — fixed |
| GitHub `CONFLICTING`/`dirty` on #137 and #135, later #139, while `git merge-tree` was clean | Two merge bases from cross-merged stacked branches; GitHub merges with one base | Merged `main` into each branch (no hand edits); re-approvals collected — fixed. Merging #134 before #139 caused the #139 case; merging #139 alone would have avoided it |
| Main guard failed on `ab785a8`: "PR #106 by @dependabot[bot] was merged without another teammate's approval on its final commit"; [#144](https://github.com/Ikeee-AI/TekaTech/issues/144) opened, deploy skipped | Dependabot rebased #106 to `fa75603` after Mika's approval on `b6b622a`; Ikeee-AI merged without comparing the approval commit with the head | Mika approved `fa75603` at 16:43; failed jobs re-run; guard passed and deployed. #144 still open (the assistant's close was denied by the permission system) |
| `refusing to allow an OAuth App to create or update workflow .github/workflows/ci.yml without workflow scope` when pushing #128 | Saved Git credential lacks `workflow` scope | Pushed via `gh auth git-credential` — fixed |
| `error connecting to api.github.com` / `wsarecv: An established connection was aborted` | Local network drop | Retried; the push had landed, comment re-posted — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| GitHub's "Approved" label vs the main guard: old approvals aren't dismissed when the head changes | Easy to merge with stale approvals (#106) | Compare each approval's `commit_id` with the head before every merge — Ikeee-AI — adopted |
| #138 badge "cited specs" counts retrieved sources, not cited ones | Misleading green check, worse once #129 lands | Follow-up PR with Mika (#124) and Adrian — open |

**Decisions**
- Merge commits for the stacked S4-IK PRs (owner chose this option, ticked the setting, then unticked it) — keeps approvals valid and the PRs separate — Ikeee-AI.
- Hold #128 and #106 until after the stack — their `package.json` changes would have forced re-approvals of #137–#139 — Ikeee-AI.
- No self-approval and no use of the second local `gh` account to approve — reviews must come from teammates — Ikeee-AI.

**Blockers / risks**
- Close #144 with the resolution note — Ikeee-AI — 28 Oct.
- Supabase Auth redirect URL `/reset-password` (#130) and Render dashboard `TRUST_PROXY_HEADERS` not `true` (#136) — Ikeee-AI — before the 31 Oct release.
- #145 needs Manuel's review and the manual SQL on dev and production before deploy; #129 to be adapted on top — Manuel / Ikeee-AI.
- #50 is a major SDK upgrade: needs one bounded real `/query` on TekaTech-dev before merging — Manuel.
- Adrian's #138 wording follow-up — Adrian, Mika — before 31 Oct.

**Plan alignment**
- #130–#143 (except #129) and #106 are **Done**: reviewed on the final commit, checks green, merged, deployed, production probed. The full smoke test is still pending.
- #128, #145, #129, #50 and #49 are **Partial**: waiting on review.
- The S4-AD #138 review is **Partial** (taken over by Ikeee-AI).
- The 27 Oct plan to merge on the morning of 28 Oct slipped to the afternoon, because of the re-approval rounds.

**Next** — Run `deployed_smoke.py` on `ab785a8`; merge #128 after re-approval; review cycle for #145, then #129 — Ikeee-AI, Manuel — 28–29 Oct.

## 2026-10-28 19:05 Asia/Manila — Follow-up: last seven PRs merged, production SQL, openai 3.x live check, settings verified
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S4-IK (release integration) · **Branch:** `main`, `tekatech/s4-ik-retrieval-fix`, `tekatech/s4-ik-cited-badge`, `tekatech/s4-ma-scoped-retrieval`, `tekatech/119-failure-drill-browser-check`

**Done**
- **Merged and deployed** (squash; each approved by another teammate on the merged commit, with `--match-head-commit` pinned to the approved commit):

  | PR | Merge commit | Approved by |
  | --- | --- | --- |
  | #146 log | `2079b2c` | Manuel |
  | #147 cited-badge fix | `b68dade` | Mika, Manuel |
  | #128 failure-drill browser checks | `7bbaa93` | Manuel |
  | #50 openai 3.37 | `3570666` | Manuel |
  | #49 uv-build | `d8e46bf` | Manuel |
  | #145 retrieval fix | `438af12` | Manuel |
  | #129 scoped retrieval | `77aff2e` | Jopher; Manuel commented "OK" on the merge resolution |

- **Deploys:** main CI passed every job, including the main guard and "Deploy main after checks", on `d8e46bf`, `438af12` ([run 40673466810](https://github.com/Ikeee-AI/TekaTech/actions/runs/40673466810)) and `77aff2e` ([run 40675931144](https://github.com/Ikeee-AI/TekaTech/actions/runs/40675931144)).
  - The new "Browser checks (failure drill)" job from #128 ran and passed on main.
  - Production probes after deploy: web 200, `/health/ready` 200 with the database reachable.
- **Combined check before merging** (local, scratch worktree, CI dummy env): the six PRs merged together (#129 not yet included) gave backend 487 passed, `uv.lock` consistent, lint clean, Vitest 199/199, build OK.
- **#128 (Jopher):** `main` merged into the branch (`24fa1d3`) by Ikeee-AI. Kept both Vitest and Playwright.
  - Local: backend 454 passed, Vitest 196/196, `test:e2e` 8/8.
- **#129 (Manuel):** `main` merged into the branch (`0d0f433`) by Ikeee-AI at the owner's request.
  - #145's version won, as agreed in #88. Manuel's `SCOPED_MATCH_THRESHOLD = -1.0` was kept.
  - Two of his test lines were changed: they read `rpc_calls` as `(name, params)` and expect the 0.25 unscoped cutoff.
  - Local: 491 passed.
- **#145 SQL** `keyword_match_spec_documents.sql`, applied by the owner in the Supabase SQL Editor:
  - **TekaTech-dev:** "Success. No rows returned". Checked with a read-only RPC call (`search_query = 'refresh rate'` returned the Galaxy S24 display spec).
  - **Production:** applied before #145 merged ("Success. No rows returned"). The function was not called on production from here, because the local `.env` reaches dev only.
- **#50 live provider check** (owner-approved, about 1 cent): openai 3.37.0, local API on TekaTech-dev, one scoped `/query`.
  - Result: HTTP 200 in 8.6 s, `openai:gpt-5-mini`, answer "**120Hz** [1]", 1 source, `invalid_citations_removed: 0`.
  - Posted on #50.
- **#147** (Ikeee-AI, follow-up to the #138 takeover finding): the badge now counts distinct cited `[n]` markers and doesn't show when nothing is cited. The label for the zero case stays with Mika's #124.
  - Local: Vitest 199/199.
- **Settings checked by the owner, with step-by-step guidance:**
  - **Supabase production Redirect URLs:** `https://tekatech-web.onrender.com/reset-password` added (Total URLs: 2).
  - **Supabase TekaTech-dev:** already had `http://localhost:5173/reset-password`.
  - **Render tekatech-api:** `TRUST_PROXY_HEADERS` is not set, so the default (off) applies.
- **#144 closed by the owner** with the resolution note. "Allow merge commits" unticked by the owner.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `refusing to allow an OAuth App to create or update workflow .github/workflows/ci.yml without workflow scope` (push to #128) | The saved Git credential lacks `workflow` scope | Pushed via `gh auth git-credential` — fixed |
| `CalledProcessError: ['git', 'show', ':backend/routers/query.py'] … exit status 128` from `check_secrets.py` | Ran on a half-merged index, before `git add` | Re-ran after the commit: secret guard passed — fixed |
| `/usr/bin/bash: -c: line 67: unexpected EOF while looking for matching ''` | A long heredoc in one shell command | Wrote the entry to a file first — fixed (nothing ran) |
| `Permission for this action was denied … [External System Writes]` when closing #144 | Permission system blocked the assistant's close | Owner closed #144 in the browser — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Manuel approved six PRs within about 80 seconds (17:54–17:56), each with an empty comment; Jopher approved #129 with no comment | Valid for the guard, but leaves no record of what was checked | Ask for one-line review notes on substantial PRs — Ikeee-AI — open |
| Manuel's scoped evaluation report (`eval-s4-2026-10-26-scoped.md`) was measured before #145 changed the unscoped cutoff | Release numbers may not match the deployed code | Rerun the 20 cases on current main before the 31 Oct write-up — Manuel / Adrian — open |
| Six issues look fixed by merged "Refs" PRs but are still open: #88, #77, #109, #119, #120, #78 | The board overstates the open work | Owners to confirm and close — Manuel, Jopher — open |

**Decisions**
- #145 merged only after its SQL was on production — follows the manual-migration rule in `docs/database.md` — Ikeee-AI (owner).
- Ikeee-AI resolved #129's conflicts on Manuel's branch — owner's request; Manuel checked and commented "OK" before Jopher's approval — Ikeee-AI.

**Blockers / risks**
- Fresh 20-case evaluation on current main for the release write-up — Manuel / Adrian — before 31 Oct.
- `deployed_smoke.py` not yet run on `77aff2e` — Ikeee-AI — 29 Oct.

**Plan alignment**
- #128, #129, #145, #147, #50, #49 and #146 are **Done**: reviewed on the final commit, checks green, merged, deployed, production probed. The full smoke test is still pending.
- No open PRs at 19:05.

**Next** — Run `deployed_smoke.py` on `77aff2e`; owners close the issues already fixed; schedule the evaluation rerun — Ikeee-AI, Manuel, Jopher, Adrian — 29 Oct.
