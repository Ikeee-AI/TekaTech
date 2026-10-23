# S3-MI UI evidence (Refs #55)

Screenshots for Sprint 3 S3-MI: answer, comparison and citation states, plus pending/failed indexing. All are in `docs/screenshots/s3/`, each at exactly **360 px** and **1280 px** wide. They were captured with headless Microsoft Edge using DevTools device metrics, and every capture reported no horizontal overflow.

**How they were made:** every API response was mocked in the browser, so no real AI, database or indexing calls were made. Each screenshot was taken on the PR branch that introduced the change; it shows that branch on its own, not all S3-MI PRs merged together.

## What a user sees

| State | What it looks like | Screenshot (`-360` / `-1280`) | Branch / PR |
| --- | --- | --- | --- |
| Answer | Green "Answer based on N cited specs" pill, numbered citation chips, source list with the cited source focused and highlighted | `answer-success` | `S3-MI-citations` (parts A + B) |
| Missing evidence | Amber "No Evidence Found" notice with next steps, no Copy button | `answer-missing-evidence` | `S3-MI-citations` |
| Timeout | "The AI Timed Out" — no answer was produced, Try Again | `answer-timeout` | `S3-MI-citations` |
| AI unavailable | "AI Answers Are Unavailable" — spec browsing still works | `answer-unavailable` | `S3-MI-citations` |
| Malformed reply (200 with an HTML traceback) | "Unusable AI Response"; the traceback is **not** shown | `answer-malformed` | `S3-MI-citations` |
| Unusable reply (backend 503) | "Unusable AI Response" | `answer-unusable` | `S3-MI-citations` |
| Lost connection | "Connection Problem" | `answer-network` | `S3-MI-citations` |
| Comparison AI timeout | Same failure notice inside the comparison panel | `compare-ai-timeout` | `S3-MI-citations` (old compare layout) |
| Some specs indexed | "1 of 3 Specs Ready for AI", Ready / Pending badges | `indexing-mixed` | `S3-MI-indexing-states` (part C) |
| Indexing failed | "Indexing Failed — Your Spec Is Saved", reason, Retry Indexing | `indexing-failed` | `S3-MI-indexing-states` |
| No specs indexed | "The AI Has No Evidence for This Gadget Yet" | `indexing-none-ready` | `S3-MI-indexing-states` |
| Mobile comparison | Gadgets as columns, specs as aligned rows, "Lowest price" label | `compare-layout` | `S3-MI-mobile-compare` (part D) |

## Acceptance checks

- **Answer vs missing evidence vs failure:** each has its own color, title and wording. Every failure says that no answer was produced, so a failure never looks like success.
- **No stack traces:** failure copy is fixed text, or the backend's own plain 503 sentences. In the malformed-reply mock the reply body contained a traceback, and it does not appear on screen.
- **Citations:** 24 px chips, named "Source N: gadget" for screen readers, and keyboard focus moves to the cited source.
- **Mobile comparison:** usable at 360 px with no overflow.

## Still to do

- **Provider-failure drill recheck:** these screenshots use mocked failures. The issue asks to recheck the visible states during the team's provider-failure drill with Manuel's failure simulator, which is not in the repository yet. Repeat the timeout, malformed-response and missing-evidence checks against the real simulator when it is available.
