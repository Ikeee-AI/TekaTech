# S3-JO evidence: ask, compare, share, corrections and failure recovery

Recorded on 2026-10-23 against **TekaTech-dev** (never the live project), with the backend and frontend running locally.

Desktop-width screenshots. The signed-in email is covered on every image.

Step key: **8a** ask from a gadget page · **8b** visible, reusable share link · **8c/8d** saved links and comparisons retry instead of saying "not found" · **9** friendly request errors + failure drill · **10** correction submission and admin review.

| # | File | Step | What it shows |
|---|---|---|---|
| 01 | [01-8a-ask-from-gadget-page.jpg](01-8a-ask-from-gadget-page.jpg) | 8a | "Ask About iPhone 15" answers "A16 Bionic" with citation [1] |
| 02 | [02-8a-citation-opens-source.jpg](02-8a-citation-opens-source.jpg) | 8a | Clicking [1] opens the matching source card (iPhone 15, 57% match, Source link) |
| 03 | [03-8b-share-link-visible.jpg](03-8b-share-link-visible.jpg) | 8b | Share creates one link, shows it in a "Share Link" box, and copies it |
| 04 | [04-8c-missing-link-not-found.jpg](04-8c-missing-link-not-found.jpg) | 8c | A slug that does not exist (404) still says "This Link Doesn't Exist" |
| 05 | [05-9-ask-server-down-question-kept.jpg](05-9-ask-server-down-question-kept.jpg) | 9 | Server down: "Couldn't Get an Answer / Can't reach the server..." + Try Again; question kept |
| 06 | [06-9-ask-retry-recovers.jpg](06-9-ask-retry-recovers.jpg) | 9 | Server back, Try Again: answer with [1], no retyping |
| 07 | [07-9-correction-server-down-text-kept.jpg](07-9-correction-server-down-text-kept.jpg) | 9 | Server down on submit: error shown, typed correction kept |
| 08 | [08-8c-saved-link-server-down-retry.jpg](08-8c-saved-link-server-down-retry.jpg) | 8c | Saved link while server down: "Couldn't Open This Comparison" + Try Again (not "doesn't exist") |
| 09 | [09-8d-compare-server-down-retry.jpg](09-8d-compare-server-down-retry.jpg) | 8d | Compare page while server down: "Couldn't Load This Comparison" + Try Again (not "pick 2 gadgets") |
| 10 | [10-8d-compare-retry-recovers.jpg](10-8d-compare-retry-recovers.jpg) | 8d | Server back, Try Again: both phones load |
| 11 | [11-9-ai-provider-error-safe.jpg](11-9-ai-provider-error-safe.jpg) | 9 | Backend started with an invalid OpenAI key (process env only): `POST /query` returns 503 and the panel shows "AI Answers Are Unavailable" (Mika's #95 failure state, using #75's 503 detail) + Try Again, question kept. Retaken 24 Oct after merging main |
| 12 | [12-10-correction-typed.jpg](12-10-correction-typed.jpg) | 10 | Logged-in user types a correction on the Test spec |
| 13 | [13-10-correction-submitted.jpg](13-10-correction-submitted.jpg) | 10 | "Correction submitted for review" |
| 14 | [14-10-review-queue-two-pending.jpg](14-10-review-queue-two-pending.jpg) | 10 | Admin Review Queue: two pending corrections with current vs suggested text |
| 15 | [15-10-rejected.jpg](15-10-rejected.jpg) | 10 | Reject: "Correction rejected", removed from queue |
| 16 | [16-10-approved-queue-empty.jpg](16-10-approved-queue-empty.jpg) | 10 | Approve: "Correction approved and applied", queue empty |
| 17 | [17-10-approved-persisted-after-reload.jpg](17-10-approved-persisted-after-reload.jpg) | 10 | Fresh page load: spec shows the approved text (Pending AI Indexing, by design) |

Database check after step 10 (dev-guarded service client, read-only):

| Correction | Status |
|---|---|
| "Test spec, corrected and approved in step 10." | approved, and is now the Test spec's content |
| "Wrong value, to be rejected in step 10." | rejected |
| "A16 Bionic chip (drill test, please reject)." (earlier drill) | rejected; iPhone 15 spec unchanged |

Not shown: slow-network throttling (needs Chrome DevTools); the loading state is visible while answers generate.
Known limit: the AI search cutoff (MATCH_THRESHOLD = 0.5, Manuel's area) rejects some valid questions such as "What is the screen size?" (0.45).
