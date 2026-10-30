# S4-JO user-journey acceptance report

Owner: Jopher (`s2100932`, AI-assisted: yes). Work package S4-JO in [sprints-2-to-5.md](../../sprints-2-to-5.md): *"A fresh test user completes all applicable core journeys on the release candidate; permissions and refresh persistence hold; no unresolved critical/high-priority workflow defects."*

**Status: 18 of 20 journeys pass; 0 fail.** Rows 19–20 are still open (⬜), and depend on Ikeee-AI (Supabase redirect URL, next production deploy). Nothing is claimed without a result.

## Where it was run
- **Code:** local `main` at `f1e6151` (29 Oct; includes #128–#149). This is the release candidate until the tag.
- **Data:** TekaTech-dev (`efdgguybkampozuvqjrz`) through a local backend and frontend. Never production, by team rule; the production read-only check is at the end.
- **AI calls:** a few small `gpt-5-mini` / embedding calls on dev, each well under one cent.

## Results

| # | Journey | Who | Result | Evidence |
|---|---|---|---|---|
| 1 | **Setup from a fresh clone** (README only) | — | ✅ Pass, 29 Oct. 491 backend / 199 frontend tests; servers up; CORS OK; cited answer | [fresh-checkout-2026-10-29.md](../fresh-checkout-2026-10-29.md) |
| 2 | **Browse the catalog**: filters, sort, search, gadget page | logged out | ✅ Pass, 29 Oct. 13 dev gadgets; detail page shows specs and badges | this run |
| 3 | **Ask about one gadget**: "What chip does it use?" on iPhone 15 | logged out | ✅ Pass, 29 Oct. "A16 Bionic [1]"; the citation opens the source | fresh-checkout run; [pr-proof-s3](../../pr-proof-s3/README.md) 01–02 |
| 4 | **Ask across the catalog** (top search + Enter): "Which phone has the bigger battery?" | logged out | ✅ Pass, 29 Oct. "Galaxy S24 has a 4000mAh battery [1]"; says the iPhone 15 capacity isn't in the snippets, rather than guessing | this run |
| 5 | **Compare from the catalog tray**: pick iPhone 15 + Galaxy S24 → Compare Now → Generate Comparison | logged out | ✅ Pass, 29 Oct. Answer based on 6 cited specs (chip, battery, camera, charging) | this run |
| 6 | **Share a comparison**: Share → open `/c/{slug}` | logged out | ✅ Pass, 29 Oct. `/c/cvuhtsn` reopened the same 2-gadget comparison; a made-up slug shows "This Link Doesn't Exist" | this run |
| 7 | **Unknown page** | logged out | ✅ Pass. "404 Page Not Found" with Back to Catalog | this run |
| 8 | **Failure recovery** (timeout / unavailable / unusable / no evidence): question kept, Try Again works | logged out | ✅ Pass. 8 browser checks in CI (#128); real-backend drill on dev (#151) | `frontend/e2e/`, [failure-drill-dev-2026-10-28.md](../failure-drill-dev-2026-10-28.md) |
| 9 | **Logged-out and bad-token permissions**: 11 write/admin routes × no token and fake token | logged out | ✅ Pass, 29 Oct. **22/22 refused with 401**; public reads 200; malformed id 422; dev data unchanged (hash and count compared before/after) | [permissions-logged-out.txt](permissions-logged-out.txt) |
| 10 | **Correction → approve → re-index → My Suggestions** | admin | ✅ Pass, 29 Oct. Pending → Approved; the automatic re-index made a real embedding call (4.5 s); spec restored to its original text afterwards | [corrections-01](corrections-01-pending.png), [02](corrections-02-approved-reindexed.png), [04](corrections-04-approved.png), [06](corrections-06-restored.png); #142, #109 comments |
| 11 | **Fresh test user** (new non-admin account on dev) signs up and logs in | new user | ✅ Pass, 30 Oct. Signed in; the top bar shows Catalog and Compare only | [11](11-new-user-signed-in.jpg) |
| 12 | **Create a gadget** "ACCEPT Phone 29 Oct" → appears in catalog → **refresh** keeps it | new user | ✅ Pass, 30 Oct. Saved (`created_at` 03:50 UTC); catalog 13 → 14; still there after refresh | [12](12-gadget-created.jpg) |
| 13 | **Edit**: price 9999, then empty it → **refresh** | new user | ✅ Pass, 30 Oct. Php 9,999 → "Not listed"; database `price_php = null` (confirms the #135 fix) | [13a](13a-price-set.jpg), [13b](13b-price-cleared.jpg) |
| 14 | **Add specs** (2 short blocks) → Pending AI Indexing → Index for AI → Ready for AI → **refresh** | new user | ✅ Pass, 30 Oct. One `POST …/index` → 200 in 5.0 s (real embedding); database `indexed`. Saved as **1** card, not 2: see D6 | [14a](14a-add-specs.jpg), [14c](14c-ready-for-ai.jpg) |
| 15 | **Ask** "What is the battery capacity?" on the new gadget | new user | ✅ Pass, 30 Oct. "5000 mAh [1] … 45W wired charging [1]"; answer based on 1 cited spec; the source card shows the new spec | [15](15-cited-answer.jpg) |
| 16 | **Non-admin limits**: Review Queue, `/corrections`, delete buttons | new user | ✅ Pass, 30 Oct. No Review Queue link; typing `/corrections` redirects to the catalog (`ProtectedRoute adminOnly`); no Delete Gadget button or bin icons. Backend side: row 9 and the #131 tests (non-admin gets 403) | [16](16-non-admin-redirected.jpg) |
| 17 | **Suggest a correction** as the new user → admin **Rejects** → new user sees it | new user + admin | ✅ Pass, 30 Oct. Pending → admin `PATCH /corrections/…` 200 → **Rejected** + "New decision" badge; spec text unchanged and still indexed | [17a](17a-pending.jpg), [17b](17b-rejected.jpg) |
| 18 | **Admin clean-up**: Delete Spec, then Delete Gadget | admin | ✅ Pass, 30 Oct. Both ask to confirm and say what goes; `DELETE` spec 204, `DELETE` gadget 204; gadget now 404; catalog back to 13 | [18a](18a-delete-spec-confirm.png), [18b](18b-delete-gadget-confirm.png) |
| 19 | **Forgot password** email arrives and the link opens Reset Password | new user | ⬜ Optional: depends on the Supabase redirect URL set by Ikeee-AI (#130) | |
| 20 | **Data survives redeployment**: production gadget count and one gadget unchanged before/after a deploy (read-only) | — | ⬜ Read-only; with Ikeee-AI at the next deploy | |

## Defects found

| # | Defect | Severity | Status |
|---|---|---|---|
| D1 | Compare page (desktop): gadget columns have uneven widths; the longest name takes the widest column | Low (looks) | [#156](https://github.com/Ikeee-AI/TekaTech/issues/156), Mika |
| D2 | Catalog compare tray stops at 3 gadgets ("You can compare up to 3 gadgets at a time"), but the compare page and backend accept 5 (`MAX_COMPARE_GADGETS = 5`) | Low (inconsistent limit) | ⬜ To raise with the team: pick one limit |
| D3 | Answer panel said "N Sources Cited" for all retrieved chunks, contradicting the cited count | Low (wording) | Fixed in #150 (approved), waiting for merge |
| D4 | Approving a correction kept the old embedding, so re-index did nothing | High (stale AI answers) | Fixed in #142, verified on dev (row 10) |
| D5 | PATCH gadget ignored `null`, so clearing a field did nothing | Medium | Fixed by Ikeee-AI (#135); confirmed by a real user in row 13 |
| D6 | The Add Specs hint says "Separate distinct facts with blank lines — each becomes its own searchable chunk", but `chunk_text()` (`backend/embeddings.py`) packs short paragraphs into one chunk on purpose. Two short blocks became 1 card in row 14 | Low (misleading hint) | ⬜ To report: either the hint changes (SpecManager.jsx, Mika) or the backend splits on blank lines (Manuel). The quick-start guide in #155 repeats the hint and gets the same fix |

**No open critical or high defects.** The open ones (D1, D2, D6) are low: looks and wording.

## Clean-up
All test data from rows 12–18 was deleted in row 18. The dev catalog is back to 13 gadgets, and the "Test" spec from row 10 was restored to its original text. The new test user account remains on dev, as a non-admin.

## Notes for the demo
- Dev has leftover test gadgets ("121", "Test", "Ewdewe", "CRUD Check Phone"). Production is what the demo uses.
- The iPhone 15 spec pack has no battery capacity, so battery questions get an honest "not in the specs". Use "What chip does it use?" for a clean cited answer.
