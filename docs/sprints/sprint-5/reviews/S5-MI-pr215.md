# S5-MI pre-review: PR #215, add or swap a gadget on the Compare page (Closes #203)

Prepared 3 Nov 2026 by Ikeee-AI with Claude Code (AI-assisted pre-review). **Not a teammate review:** Jopher's approval is the review that counts. Nothing was posted to the PR.

- Head `563f737`, branch `S5-MI-compare-add-gadget`, author Mika (`meka-moka`). Jopher approved the head commit.
- CI on the head: required checks green. **PR policy failed, but that is a false positive in the pipeline, not in this PR.** `.github/workflows/pr-review.yml:48` runs `git diff "$BASE_SHA" "$HEAD_SHA"` (two dots). This branch started from `b017915`, before #210 added `backend/sql/user_questions.sql`, so that file counts as "changed" here. A three-dot diff fixes it (Ikeee-AI).
- Combined trial merge with #214 and #216 onto `main` (`3986bf1`): no conflicts, eslint clean, 322 tests passed, build ok.

| # | Required item (S5-MI / #203) | Status | Evidence | Fix needed |
| --- | --- | --- | --- | --- |
| 1 | Add a gadget from the Compare page, synced to `?ids=`, share link and AI | Met | `ComparePage.jsx:148-152` (`addGadget`, dedupe, `MAX_COMPARE_GADGETS`); reuses `api.getGadgets()`; router state kept | — |
| 2 | Keyboard and focus behaviour as claimed | **Partial** | Escape/Close return focus (`CompareAddGadget.jsx:39-42`). Picking a gadget closes the panel without restoring focus (`CompareAddGadget.jsx:123-126`), and the page then swaps to its loading skeleton (`ComparePage.jsx:154`), so focus falls to `<body>` | Return focus after an add (to Add Gadget, or to the "Comparing N Gadgets" heading once loaded). Add a test |
| 3 | 40 px touch targets (claimed) | **Partial** | Close is `w-8 h-8` = 32 px (`CompareAddGadget.jsx:85`); Try Again has no minimum height (~line 108) | `w-10 h-10` on Close; `min-h-10` on Try Again |
| 4 | Quiet screen-reader updates | Partial (low) | `aria-live="polite"` wraps the whole result list (~line 103), so each keystroke can re-read it | Optional: a separate sr-only status with the match count |
| 5 | Tests | Met | `ComparePage.addGadget.test.jsx` (4 tests, mocked API) | Add the focus-after-add test (item 2) |
| 6 | Ownership | Note | Catalog loading/error/retry and the `?ids=` update are workflow state, Jopher's area (`docs/sprints-2-to-5.md`) | None needed; Jopher reviewed it. Say so in the PR body |

**Verdict: Changes requested (small).** Smallest first:
1. Close 32 → 40 px; `min-h-10` on Try Again.
2. Restore focus after a gadget is added, with a test.
3. Optional: a quieter live region.

Deadline: S5-MI is due Sat 7 Nov 15:00; these fit in one short follow-up commit. Sprint gate not at risk. Before merging, Ikeee-AI fixes the PR-policy false positive or re-runs the policy check on an updated base.
