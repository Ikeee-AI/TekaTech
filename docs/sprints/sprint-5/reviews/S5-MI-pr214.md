# S5-MI pre-review: PR #214, screen-reader names read as separate words (Closes #207)

Prepared 3 Nov 2026 by Ikeee-AI with Claude Code (AI-assisted pre-review). **Not a teammate review:** Jopher's approval is the review that counts. Nothing was posted to the PR.

- Head `9a692a1`, branch `S5-MI-sr-only-names`, author Mika (`meka-moka`). Jopher approved the head commit.
- CI on the head: all checks green.
- Combined trial merge of #214 + #215 + #216 onto `main` (`3986bf1`): no conflicts, eslint clean, vitest 31 files / 322 tests passed, build ok, secret guard passed.

| # | Required item (S5-MI) | Status | Evidence | Fix needed |
| --- | --- | --- | --- | --- |
| 1 | Accessibility fix within existing scope | Met | Accessible names now start with the visible text: `GadgetList.jsx:754,763,766`, `AdminCorrections.jsx:167,177`; `CountBadge` in `Navbar.jsx:15-24` reads ", 3 pending" | — |
| 2 | Before/after evidence | Met | Both new tests failed on `main` first (PR body); Chrome accessibility tree checked at 1280 px | Optional: a 360 px / phone-menu browser check |
| 3 | Tests for the changed behaviour | Partial | `GadgetList.names.test.jsx`, `Navbar.badgeNames.test.jsx`; Approve/Reject have no test (the body says so) | Optional: one test for Approve/Reject names |
| 4 | Ownership, invariants, secrets | Met | Frontend presentation files only; no data-table queries; lint conventions kept | — |

**Verdict: Accept.** Low-priority notes only: `GadgetCard` is exported only so the test can use it, and there is no Approve/Reject test. Next: `pr-gate`, then merge.
