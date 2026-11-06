# Changelog

Stable releases of TekaTech, newest first. The frozen course submission is `v1.0.0`; later entries are post-release (Sprint 5) work, kept separate from it. Each line links its reviewed PR. Full per-release records are in [`docs/releases/`](docs/releases/).

## v1.1.0 — Sprint 5 stable release (`db49bc2`, tagged 2026-11-06)

**Target commit `db49bc2` (6 Nov 2026); the tag `v1.1.0` isn't created yet.** All changes below are merged to `main`, deployed, and passed the deployed smoke check on `db49bc2` (6 Nov, 07:23 UTC). The record, its verification, security checks and the full list of 58 PRs are in [`docs/releases/v1.1.0.md`](docs/releases/v1.1.0.md).

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
