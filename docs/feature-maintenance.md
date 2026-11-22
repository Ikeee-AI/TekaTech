# Feature-maintenance notes: user journeys

Owner: Jopher (`s2100932`, S5-JO). Written 5 Nov 2026 against `main` at `e3852b9`. These notes cover the **user journeys**: gadgets, specs, compare and share, corrections, sign-up links, the image-link check and the account page. For each one they say where the code is, what must stay true, how it's tested and what is still open. For API, provider and database problems, use the [troubleshooting guide](troubleshooting.md). For setup, use the [README](../README.md).

## Rules that apply to every journey

- **The browser never queries data tables.** Supabase in the browser is for login only. Everything else goes through `frontend/src/api/client.js` to the FastAPI backend.
- **The route is the only access control.** The backend uses the service-role key, which skips Row Level Security. A route without `Depends(get_current_user)` or `Depends(get_current_admin_user)` is public. Hiding a button is not protection.
- **Admin comes from `app_metadata.is_admin` only.** Users can edit `user_metadata`, so never read admin from it, in the frontend or the backend.
- **Since 3 Nov the catalog is admin-curated:** creating or editing gadgets and adding, indexing or deleting specs are admin-only (#195). Members suggest corrections and keep a My Gadgets list.
- **Keep the visible labels stable.** The quick-start, the demo script (`docs/demo/user-demo-script.md`), the acceptance report and the Playwright checks use the button names. If you rename one, update those in the same PR.

## Gadgets (create, edit, delete)

| | |
| --- | --- |
| Code | `backend/routers/gadgets.py` (`create_gadget`, `update_gadget`, `delete_gadget`), `backend/schemas.py`, `frontend/src/components/GadgetForm.jsx`, `frontend/src/utils/gadgetValidation.js` |
| Must stay true | All writes use `get_current_admin_user`. Category is normalised to one spelling (`normalize_category`, #110). PATCH treats `null` as "clear this field" (#135), so an emptied price becomes "Not listed". The form validates the same required fields as the backend. |
| Tests | `backend/tests/test_gadgets.py`, `test_authorization_matrix.py`; `GadgetForm.imageLink.test.jsx`, `gadgetValidation.test.js` |

### Image link check (#208)
- `frontend/src/components/ImageLinkPreview.jsx` loads the link as an `<img>`, the way the catalog card does, and reports `loaded` or `failed`. `GadgetForm.jsx` keeps the result **together with its URL** (`imageCheck`), so a changed link is checked again instead of reusing the old result.
- `validateGadget(form, { imageStatus })` blocks saving when the preview failed (`IMAGE_LINK_FAILED`). It also blocks while the preview is still loading **and** the link doesn't look like an image (`IMAGE_LINK_UNCHECKED`; "looks like" means a `.jpg/.jpeg/.png/.webp/.avif/.gif` path or a `fmt`/`format` query). A link that loads is accepted whatever its ending, because many CDN images have none.
- **Don't move this check to the server.** A backend that fetches admin-supplied URLs is an SSRF risk. The API only checks that it's an http(s) link (`clean_http_url`). This check is a guard against honest mistakes, not a security control.
- An empty field saves, and on Edit it clears the stored link (`null`).
- The preview box uses the catalog card's size and `object-cover` (#216), so "this is how the card will show it" stays true. Change both together.
- Tests: `GadgetForm.imageLink.test.jsx`, `gadgetValidation.test.js`.

## Specs (save, index, delete)

| | |
| --- | --- |
| Code | `backend/routers/specs.py` (`ingest_spec_text`, `index_spec`, `delete_spec`), `frontend/src/components/SpecManager.jsx`, `frontend/src/utils/specLayout.js` |
| Must stay true | **Saving makes no AI call.** Chunks are stored `pending` with no embedding, so an AI outage never loses text. `index_spec` embeds one chunk and only writes the vector if the text still matches (`.eq("content", …)`), so a vector can't describe old text. Delete is admin-only and scoped to the gadget in the URL (#127). Every write clears that gadget's cached answers (`answer_cache.invalidate_gadget`). The frontend limit `MAX_SPEC_CHARS` mirrors the backend's `MAX_RAW_TEXT_LENGTH`. |
| UI | One merged sheet for every saved part (`mergedSheet`, #285): each section heading once, a section list, a "Find a spec" search and a fixed height. Each row keeps the part it came from, so Suggest a correction (the flag) targets that part. "Label: value" lines show as facts (`specBlocks`), for display only. Admins see the same sheet plus a readiness bar with **Index All Pending** (#200: one part at a time, stops on 429 rate limit or 401 session expired) and a **Saved parts** section (index or delete per part). |
| Tests | `backend/tests/test_specs.py`; `SpecManager.test.jsx` |
| Known issue | `chunk_index` restarts at 0 on every save, and the list is ordered by `chunk_index` only. Two saves from the same link are therefore interleaved inside one card (A#0, B#0, A#1…). The fix belongs in the backend: order by `created_at`, then `chunk_index` (noted in the #211 review). |

## Corrections (suggest, approve or reject, follow up)

| | |
| --- | --- |
| Code | `backend/routers/corrections.py` (`resolve_correction`), `frontend/src/pages/AdminCorrections.jsx` (Review Queue), `frontend/src/pages/MySuggestions.jsx` and the inbox badge in `Navbar.jsx` |
| Must stay true | Any signed-in user can submit, and only admins resolve. **Approve** replaces the spec text **and** sets `indexing_status = 'pending'`, `embedding = null` (#142), then clears all cached answers. Otherwise retrieval would match the old meaning while showing the new text. The status check is part of the UPDATE (`.eq("status", "pending")`), so the same correction can't be resolved twice. After approving, the Review Queue calls `indexSpec` (`reindexApprovedSpec`), so the corrected text is searchable again. Reject never touches the spec. |
| Tests | `backend/tests/test_corrections.py`; acceptance rows 10 and 17 |

## Compare and share

| | |
| --- | --- |
| Code | `frontend/src/pages/ComparePage.jsx`, `frontend/src/components/CompareAddGadget.jsx` (#215/#222), `backend/routers/comparisons.py` |
| Must stay true | `?ids=` in the URL is the single source of truth: adding and removing both go through `setSearchParams` and keep the router state, so "Back to My Gadgets" still works afterwards. A share link belongs to one exact set of ids (`share.key === idsKey`); changing the set drops it. Backend limit: `MAX_COMPARISON_GADGETS = 5`. After adding a gadget, focus returns to **Add Gadget**, or to the heading at 5 gadgets. |
| Tests | `ComparePage.addGadget.test.jsx`, `backend/tests/test_comparisons.py`, the Playwright compare cases |
| Known issue | D2 from the acceptance report: the catalog tray stops at **3** ("You can compare up to 3 gadgets at a time", `GadgetList.jsx`), while the compare page, My Gadgets and the backend allow **5**. A layout choice for Jopher and Mika; still open. |

## Asking the AI (journey wiring only)

The gadget chat (`GadgetChatPanel.jsx`, #210) and the comparison panel (`AIComparisonPanel.jsx`) belong to Ikeee-AI, Mika and Manuel. What I keep working is the **failure journey**: the question is kept, and **Try Again** resends it without retyping.
- `frontend/e2e/failure-drill.spec.js` (#128): the gadget-page and compare journeys × timeout, quota, unusable output and no evidence, 8 checks. They run in CI ("Browser checks (failure drill)").
- `frontend/e2e/support/fakeApi.js` answers every API call in the browser, so there's no backend, login or AI cost. `backend/tests/test_failure_contract.py` keeps the faked 503 sentences equal to `DETAIL_*` in `routers/query.py`.
- **If you change the AI panel's labels** (box label, Send button, "Latest question: …"), update the spec's `JOURNEYS` in the same PR. #210 broke 4 of the 8 checks this way.
- Run locally: `cd frontend && npm run test:e2e`. It builds the app with fake service addresses, so it can't reach dev or production. If Playwright asks for a browser, run `npx playwright install chromium`.

## Sign-up links and resend (#198)

| | |
| --- | --- |
| Code | `frontend/src/utils/authLink.js`, `frontend/src/supabaseClient.js`, `frontend/src/utils/authErrors.js` (`classifyAuthLink`, `isEmailNotConfirmed`), `frontend/src/components/AuthLinkNotice.jsx`, `frontend/src/pages/Login.jsx` (`?mode=signup|resend`), `resendConfirmation` in `context/AuthContext.jsx` |
| How it works | Supabase returns the result of an email link in the URL: `#access_token=…&type=signup` when it worked, `#error_code=otp_expired…` when it didn't. supabase-js clears the hash while it starts up, so `authLink.js` saves it at module load. |
| Must stay true | **`import './utils/authLink'` stays the first line of `supabaseClient.js`**, before `createClient`. Moved later, the hash is already gone and no notice ever shows. The notice is skipped on `/reset-password`, which reads its own link. The "resent" message is deliberately neutral ("If this email has an account…"), so the page doesn't reveal which emails are registered. The resend link comes back to `window.location.origin`, so Supabase's allowed redirect URLs must include each site address. |
| Tests | `AuthLinkNotice.test.jsx`, `Login.test.jsx`, `authErrors.test.js` |
| Open | #196 items 4–5, after the pilot |

## Account page (#209)

| | |
| --- | --- |
| Code | `frontend/src/pages/Account.jsx` (route `/account` inside `ProtectedRoute`), `frontend/src/utils/passwordChange.js`; the avatar link in `Navbar.jsx` |
| Must stay true | The role shows "Admin" only from `app_metadata.is_admin`; a test checks that `user_metadata` is ignored. Change Password calls `signIn(user.email, current)` **before** `updatePassword(next)`. A wrong current password (`isWrongPassword`) shows a field error and returns **without** updating. The rules match sign-up: `MIN_PASSWORD_LENGTH`, the confirmation must match, and the new password must differ from the current one. |
| Limit | The current-password check protects an unattended, signed-in browser **in the app**. Someone who already holds the session token could call Supabase directly, so describe it as an app protection, not a guarantee. |
| Tests | `Account.test.jsx` (11, including the call order) |
| Open | **Delete my account** (#213): a backend endpoint (Manuel) and a button here, after the pilot. `user_questions` has no foreign key to `auth.users`, so its rows must be deleted explicitly. |

## Local data and checks

- **Dev seed:** `backend/scripts/seed_dev.py` (add `--with-specs` to load and index the verified iPhone 15 / Galaxy S24 pack, which makes OpenAI calls). It refuses any project except TekaTech-dev before making a network call. Safe to rerun.
- **Before a PR that touches a journey:** `cd frontend && npm run lint && npm test && npm run build`, `npm run test:e2e` if the AI panel or Compare changed, and `uv run pytest` in `backend/` (or `backend\.venv\Scripts\python.exe -m pytest -q` without uv).
- **After deploy:** click the journey through on production and record it on the PR (for example the 4 Nov checks on #198 and #209). Use a test account; admin-only steps need a production admin.
- **Acceptance:** `docs/evidence/acceptance-s4-jo/README.md` lists the 20 journeys. Since 3 Nov rows 12–15 need an admin (#195), and a member lands on My Gadgets after login (#197).
