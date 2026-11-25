# Changelog

Stable releases of TekaTech, newest first. The frozen course submission is `v1.0.0`; later entries are post-release (Sprint 5) work, kept separate from it. Each line links its reviewed PR. Full per-release records are in [`docs/releases/`](docs/releases/).

## v1.2.0 — code-freeze release (`527aa6a`, to be tagged before the 27 Nov 2026 freeze)

**Candidate `527aa6a` (#291, 25 Nov 2026).** All changes below are merged to `main` and deployed, and they passed the deployed smoke check on `527aa6a` (25 Nov, 15:36 UTC). A signed-in Chrome check on production also passed. The record, security checks and the full list of 54 PRs are in [`docs/releases/v1.2.0.md`](docs/releases/v1.2.0.md).

### Added
- **Streaming answers** over `POST /query/stream`, with live `Server-Timing` (#289).
- **Game and chip benchmarks:** a `gadget_benchmarks` table with 130 published rows, each with a source link. They show on phone pages and are cited in performance and gaming answers (#294).
- **Web search** (opt-in, labelled "From the web"). It runs when the saved specs don't answer a question and is capped at 5 per user and 40 site-wide per day (#294, #297). **Admin web drafts:** draft spec lines and benchmarks with links, saved only after admin review (#294).
- **Chat memory:** the last 5 turns on phone pages and the compare page (#287, #294). Saved compare chats get a new table, `user_comparison_questions` (#289).
- **General knowledge on phone and compare pages** through the `NOT_IN_SPECS` fallback (gkf-v1 #276, gkf-v2 #277).
- **Admin overview page:** catalog readiness, 14-day usage and AI spend, user counts (#256). **Admin photo upload** to Supabase Storage (#272).
- **Delete My Account:** backend `DELETE /me/account` (#254), Account page button (#271, #274, #275).
- **Catalog of 23 smartphones** from official pages (#248), with sourced prices and launch-price labels (#266, #270).
- **Sign-in for AI and compare,** 20 AI questions per user per day, password rules and logout confirmation (#266).

### Changed
- **Rebrand:** dark "Night Market" default, "Bento Lab" light mode, phones by brand, VS Compare (#258), new logo (#280), UI polish (#285, #286).
- **Prompt v2 → v3 → v4** (#287, #289, #296). Faster phone-page answers through `minimal` reasoning (#287).
- **API host moved to Railway** with CI deploys (#250); Railway settings kept as code and the Render API retired (#253).

### Fixed
- Key-spec tile misreads (#259), password reset links (#265), sign-up return page (#249), spam-folder notice (#267).
- 9 fixes from the freeze-feature code review (#295). Comparison lists and follow-up count fixed (#296). Web search for cited declines, and `Vary` on trending questions (#297). Saved spec parts numbered by position (#298).

### Security and operations
- Backend hardening (#260), frontend security headers and PKCE (#261), CSP enforced (#269), browser roles locked out of the database (#263).
- CI supply chain: deploy secrets scoped to their steps, checksum-verified Railway CLI, SHA-pinned actions (#262). CI now compiles every backend module (#273).
- Railway rollback rehearsal (#252). Dependency updates: #244–#247, #264, #281–#284, #290–#293.

## v1.1.0 — Sprint 5 stable release (`db49bc2`, tagged 2026-11-06)

**Tagged `v1.1.0` on `db49bc2`, 6 Nov 2026 15:36 Manila — [GitHub Release](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.1.0).** All changes below are merged to `main`, deployed, and passed the deployed smoke check on `db49bc2` (6 Nov, 07:23 UTC). The record, its verification, security checks and the full list of 58 PRs are in [`docs/releases/v1.1.0.md`](docs/releases/v1.1.0.md).

### Added
- **My Gadgets dashboard.** Signed-in users build their own list from the catalog, then open, remove or compare 2–5 gadgets and ask the AI across them. New table `user_gadgets` (#197, #200).
- **Per-gadget AI conversation.** The gadget page's AI box is a chat. A signed-in user's questions are saved with their answers and reloaded (latest 20, citations working); New Chat clears it, and Regenerate replaces a turn. New table `user_questions` (#210).
- **Optional general-knowledge answer** (instructor-approved), opt-in and off by default. It's labelled "General knowledge, not from saved specs, unverified" and has no citations. Prompt `gk-v1` (#173, #174), UI toggle and label (#193), evaluation mode (#189).
- **Specifications grouped by source:** one collapsible card per source link (#211).
- **Add or swap a gadget on the Compare page** (#222, superseding #215; feature by Mika).
- **Account page:** email, role and change password (#209).
- **Sign-up feedback:** confirmation notice, expired-link page and resend email (#198).
- **Admin tools:** Index All Pending; admin catalog guide (#200). The admin gadget form previews the image link and blocks non-images (#208, #216).
- **Evaluation:** five regression cases from recorded defects, dataset `s5-ad-cases-v3` / `gk-cases-v3` (#225); labelled `--rules s5` scoring profile (#224); `eval_adapter --scope` for per-case gadget scope (#228); `--mode gk` (#189).
- TechSpecs import adapter, **disabled** pending written authorization (#187).

### Changed
- **The catalog is admin-curated.** Creating/editing gadgets and adding/indexing specs are admin-only; regular users browse, ask, compare, share and suggest corrections (#195). Scope change in [`docs/scope-changes.md`](docs/scope-changes.md).
- Compare returns to My Gadgets when opened from there (#200).
- **General-knowledge prompt `gk-v2`:** replies no longer repeat the prompt's own rules (GK-06). The grounded prompt stays `v1`; a grounded v2 attempt scored lower and was not shipped (#236, S5-AD takeover by Ikeee-AI).
- Catalog tagline from the live deploy challenge (#171).
- Screen readers read names as separate words (#214).
- CI uses fewer Actions minutes: labels and reviewer in one job, ruff inside the PR-policy job (#182); owner-area labels match the real file layout (#190); PR policy lists only the PR's own files (#218).

### Fixed
- Acceptance defects D1, D3 and D6; acceptance rows 19–20 pass on production (#176).
- Compare page touch targets are 40 px, and focus returns after adding a gadget (#222).
- **Max Price slider:** its last stop now means "no limit". It used to stop one step short of the top price and hide the top-priced and unpriced gadgets (#239).

### Security and operations
- Failure-drill controls stay off for normal users: an anonymous header request on production gets a normal answer (#233); the Render dashboard has no `FAILURE_SIMULATION_ENABLED` (5 Nov).
- Dependency updates (#179, #180, #181).
- API and provider troubleshooting guide (#220); backend latency/error samples before the pilot (#230); fresh-checkout regression record (#232).

### Documentation and evidence
- Post-release score report (`docs/evidence/eval-s5-2026-11-05.md`, #226) and prompt/evaluation handover (`prompts/prompt-eval-handover.md`, #227).
- User quick-start and feature-maintenance notes (#231); demo script updated (#219).
- Deploy-challenge rehearsal and timer (#170, #177); malformed-request demo (#175); pilot plan and health sampler (#183).
- `v1.0.0` release records: rollback and restore rehearsals, Sprint 4 final metrics, submission manifest (#167). AI demo cases, limitations, speaker notes and release AI-quality report (#186, S4-AD takeover).
- Incident record for the 31 Oct Actions usage limit (#178); open questions for the owner (#229); release record draft, support checklist, Week 5 packet, retrospective and pilot scope change (#235).
- Work logs and consultation packet: #184, #185, #188, #191, #192, #194, #199, #212, #217, #221, #223, #234.

### Database (apply by hand before deploying; deploys never change the database)
- `backend/sql/user_gadgets.sql` (#197) and `backend/sql/user_questions.sql` (#210). Both are applied to the live project `lqswcmkzygqmnblaukco` (3 Nov; `user_questions` after the SQL-on-dev incident, `docs/devops/incidents.md`).

### Known limitations
See [`docs/releases/v1.1.0.md`](docs/releases/v1.1.0.md#known-limitations-stated-not-hidden).

## v1.0.0 — Sprint 4 course release (31 Oct 2026)

Tagged `5aa4635` on `main`. Frozen course submission; notes in the [GitHub release](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0) and records in #167 (rollback and database-restore rehearsals, final Sprint 4 metrics, submission manifest).
