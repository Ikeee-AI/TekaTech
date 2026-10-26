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
