# Demo Day: live product demo (Part 3, Jopher, 6 minutes)

Slot 7:00–13:00 in the [deck plan](../../frontend/docs/presentation/deck-draft.md): slide 9 (route), **5:00 live on production**, slide 10 (backup screenshots, only if the live site fails).
Goal: show real CRUD that persists, related data, and grounded AI with citations, all on the **deployed** app (https://tekatech-web.onrender.com).

**Status (4 Nov):** script written 30 Oct; **updated 4 Nov** for what changed on 3 Nov. **Not rehearsed yet.** All times are targets until the rehearsal table below is filled in. Each step was already done once by hand in the [acceptance run](../evidence/acceptance-s4-jo/README.md) (rows 5–6, 12–15), but not timed.

What changed on screen since 30 Oct (production `814ef00`):
- **#210:** the AI box on a gadget page is a **chat**. Type in the message box at the bottom and press **Enter** (or the round ↑ **Send question** button); there is no "Ask" button any more. Signed in, the questions are saved for next time.
- **#211:** specs saved from one source link sit together in **one card**, with a "**N parts**" toggle in its header. Index for AI is on each part's row; admins also get **Index All Pending (N)** (#200).
- **#211:** **Suggest Correction** is now a small **flag** button on each spec row.
- **#208:** the gadget form checks the **Image URL** with a live preview. The demo leaves it empty, which still saves.

## Rules for the live demo
- **Production, read-mostly.** The only thing created is one clearly named record, **"Demo Day Phone"**, which is deleted straight after the session (admin). No edits to other people's gadgets.
- Never show an `.env`, a key, the Render or Supabase dashboards, or a teammate's email.
- If something fails, say what the app shows and move on. A clear error with **Try Again** is a feature (Adrian covers it in Part 4).

---

## Before the session (T-15 min)

- [ ] **Warm both services** about 2 minutes before Part 1: open https://tekatech-api.onrender.com/health and then the site. Cold start was measured at 42–55 s.
- [ ] **Sign in** on the demo browser with an **admin demo account** (not a personal email). Since 3 Nov 2026 the catalog is admin-curated, so a non-admin account has no **Add Gadget**, **Add Specs** or **Index for AI** and the Create steps below would fail. The navbar will also show **Review Queue**; that's expected. An admin lands on the **catalog** after logging in (a member would land on My Gadgets, #197). Check the account works the day before.
- [ ] Browser: zoom **125%**, notifications off, bookmarks bar hidden, other tabs closed. Two tabs: **catalog** and a blank one (for the share link).
- [ ] **Spec text in the clipboard** (copy from the box below).
- [ ] Check "Demo Day Phone" does **not** already exist. If it does, delete it, or use "Demo Day Phone 2".
- [ ] Backup: Mika's screenshots for slide 10 are open in the deck.

Spec text to paste in step 3:
```
Battery: 5000 mAh with 45W wired charging.

Display: 6.7-inch AMOLED, 120Hz refresh rate.
```

---

## Script (target times; total 6:00)

| Time | Do | Say (short) |
|---|---|---|
| **0:00–0:20** | Slide 9: the route checklist | "I'll add a gadget, give it specs, ask the AI about it, then compare two phones and share the result, all live on production." |
| **0:20–1:00** | **Catalog.** Point at the gadget cards, the **Category/Brand** filters, and **Popular Questions** | "This is the catalog. Everything here comes from our FastAPI backend, which reads Supabase. The browser never touches the data tables directly; it only logs in through Supabase." |
| **1:00–1:50** | **Create.** **+ Add Gadget** → Name `Demo Day Phone`, Brand `TekaTech`, Category `Smartphone`, Price `19999` → **Save Gadget** → press **F5** | "Name, brand and category are required, and the backend validates them too. Saved, and it's still here after a refresh, so it's in the database, not just on screen." |
| **1:50–2:15** | **Edit.** **Edit** → clear the price → **Save Changes** | "Editing works, including clearing an optional field: the price is now 'Not listed'." |
| **2:15–3:10** | **Related data.** **Add Specs** → paste → Source URL `https://example.com/demo` → **Save Specs** → a card headed **example.com** appears; its part shows **Pending AI Indexing** → **Index for AI** on that part → the header says **Ready for AI** | "Specs belong to a gadget: a one-to-many relationship. Saving and AI indexing are separate on purpose: if the AI provider is down, your text is still saved. Index turns it into an embedding for search. Everything from one source link stays in one card." |
| **3:10–3:50** | **Ask.** In the *Ask About Demo Day Phone* chat, type `What is the battery capacity?` in the message box → **Enter** → click the **[1]** | "The answer only uses saved specs. Every fact has a numbered citation; clicking it opens the exact snippet. The backend also removes citations that don't point to a real snippet. Because I'm signed in, this conversation is saved for next time." |
| **3:50–4:50** | **Compare.** Back to Catalog → tick **Compare** on **Poco** and **Infinix Note 50 Pro 5G+** → **Compare Now** → ask `Which has the bigger battery?` → **Generate Comparison** | "Side-by-side specs, then an AI trade-off answer that cites each phone's own spec: Poco 6000 mAh against Infinix 5200 mAh." |
| **4:50–5:20** | **Share.** **Share** → paste the link in the second tab | "Share makes a short link stored in the database, so anyone can reopen this comparison without an account." |
| **5:20–5:40** | **Corrections** (say only, no clicks): point at the **flag** button (Suggest Correction) on a spec row | "Any user can suggest a fix to a spec; an admin approves or rejects it, the user sees the decision in their inbox, and an approved fix is re-indexed for the AI automatically." |
| **5:40–6:00** | Hand over | "That's the product end to end. Adrian will now show how the answers are made and checked." |

**Buffer:** the timings leave about 20 s for a slow AI answer. If you're behind at 4:50, skip Share and say it in one sentence.

---

## If something goes wrong

| Problem | Do |
|---|---|
| Site or API is still waking (spinner > 10 s) | "Free hosting sleeps when idle; it's waking up." Talk through the catalog while it loads. Warm it earlier next time. |
| AI shows *The AI Timed Out* / *AI Answers Are Unavailable* | "This is our failure handling: the question is kept and Try Again works." Press **Try Again** once; if it fails again, move on. |
| Index for AI fails | The part shows **Indexing Failed — Your Spec Is Saved** and **Retry Indexing**. Say: "Indexing failed, but the spec is saved and readable. That's why saving and indexing are separate." Skip the Ask step and ask about **iPhone 15** instead: `What chip does it use?` (A16 Bionic [1]). |
| Whole site is down | Slide 10, backup screenshots. Say plainly that it's a screenshot. |

---

## After the session (same day)
- [ ] **Delete "Demo Day Phone"** (admin: bin icon on the spec → Delete Gadget). If the demo account isn't admin, ask Ikeee-AI. Its saved chat goes with it (`user_questions` rows are deleted with their gadget).
- [ ] If the iPhone 15 fallback was used: on iPhone 15's page, **New Chat → Delete** clears the demo account's saved questions there.
- [ ] Note any problem from the demo in the Sprint 4 log.

---

## Timed rehearsal checklist

Run it twice on **TekaTech-dev** (localhost) with a stopwatch, then once on production the day before (then delete the record).

| Step | Target end | Rehearsal 1 | Rehearsal 2 | Production dry run |
|---|---|---|---|---|
| Route slide | 0:20 | | | |
| Catalog | 1:00 | | | |
| Create + refresh | 1:50 | | | |
| Edit (clear price) | 2:15 | | | |
| Add specs + Index | 3:10 | | | |
| Ask + citation | 3:50 | | | |
| Compare + AI | 4:50 | | | |
| Share link | 5:20 | | | |
| Corrections (talk) | 5:40 | | | |
| Hand over | 6:00 | | | |
| **Problems seen** | | | | |

---

## Panel questions to be ready for (code I own)

| Question | Where | One-line answer |
|---|---|---|
| How is a gadget saved and validated? | `backend/routers/gadgets.py`, `backend/schemas.py` | Pydantic validates fields (category normalised, #110); the route checks the user is logged in; the service key bypasses RLS, so route checks are the only access control. |
| What happens on "Save Specs" vs "Index for AI"? | `backend/routers/specs.py` | Save stores chunks with no embedding and `pending`; Index embeds one chunk and only writes it if the text didn't change meanwhile. |
| Who can delete a spec? | `delete_spec` in `routers/specs.py` (#127) | Admins only (`get_current_admin_user`), scoped to the gadget in the URL. |
| What does approving a correction do? | `resolve_correction` in `routers/corrections.py` (#142) | Replaces the spec text, clears the old embedding and sets `pending`, so the re-index uses the new text. |
| How do you test failures without breaking anything? | `frontend/e2e/` (#128) | Playwright fakes the API with the backend's exact error sentences, checked by a backend contract test; it runs in CI on every PR. |
| How do you know it works for a real user? | `docs/evidence/acceptance-s4-jo/` (#158, #176) | 20 of 20 journeys pass: 18 with a fresh non-admin user on dev, each checked in the database, and rows 19–20 (password reset, data surviving a redeploy) on production. |
| Why check the image link in the browser, not on the server? | `ImageLinkPreview.jsx`, `gadgetValidation.js` (#208) | The browser loads it the way the catalog card will. A server fetching admin-supplied URLs would be an SSRF risk, so the API only checks it's an http(s) link. |
| Why does Change Password ask for the current one? | `pages/Account.jsx` (#209) | So someone at an unlocked, signed-in computer can't take the account over. It's a protection in the app; someone holding the session token could still call Supabase directly. |
