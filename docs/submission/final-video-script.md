# TekaTech — final video: recording script, Part 7 kit, pre-flight checklist

Prepared 15 Nov 2026 for the "Video Presentation via Google Drive Link" submission (max **15 min**, project ≥ 90% complete, **deployed site only**). Recorded with **OpenScreen** (free, from the Microsoft Store): microphone on, captions on, MP4 1080p.

Facts below were true on 15 Nov 2026 (production `d903e1d` or later). Re-check the numbers in the pre-flight step; say the ones you see on screen, not these.

**Links used in the video**

| What | URL |
| --- | --- |
| Live site | https://tekatech-web.onrender.com |
| Live API version | https://tekatech-api-production-549b48c9.up.railway.app/version |
| Live API health | https://tekatech-api-production-549b48c9.up.railway.app/health/ready |
| Repository | https://github.com/Ikeee-AI/TekaTech |
| Actions (CI history) | https://github.com/Ikeee-AI/TekaTech/actions |
| Database (Supabase, **production** project `lqswcmkzygqmnblaukco`) | https://supabase.com/dashboard/project/lqswcmkzygqmnblaukco |
| Backend host (Railway) | https://railway.com/dashboard → project `tekatech` |
| Frontend host (Render) | https://dashboard.render.com → `tekatech-web` |

---

## Part A — Recording script (target 14:30)

Speak in short sentences. Every claim is shown on screen. Times are targets.

### Part 1 — Introduction and progress (0:00–1:00) · *Ikeee-AI*

**Show:** the live home page.

> "This is TekaTech, a phone catalog that helps Filipino shoppers understand and compare phone specs. Every spec links to the brand's official page, and the AI answers only from those saved specs, with numbered sources you can click.
> We are about **95% complete**. Working: the catalog with sourced prices, sign-in and accounts, admin CRUD for phones and specs, photo upload, corrections, My Gadgets, AI questions with citations, comparisons, an optional general-knowledge mode, and automated CI/CD to Railway and Render.
> Remaining: polish. A mixed answer that adds a labelled general-knowledge line inside a comparison, a cache header for uploaded photos, and a custom email domain so confirmation emails stop landing in spam."

### Part 2 — System walkthrough on the deployed site (1:00–4:30) · *Jopher (user) + Ikeee-AI (admin)*

Use a **realistic example**: a shopper choosing between two phones, then an admin keeping the catalog accurate.

1. **Browse and read (Read).** Home → scroll the catalog → filter by brand/price → open **Galaxy S24**.
   > "Each phone shows sourced key specs, a price with its source and checked date, and a release date."
2. **Sign-in gate + validation.** **Start Part 2 signed out.** Click **Ask AI**.
   > "AI needs an account, so visitors can only browse."

   On **Sign Up**, type a weak password to show the live **password checklist** turning red/green. Don't submit. Then **log in as the admin account** (the owner types the password; it's masked). Admins have no daily limit, so the "X of 20" line isn't shown; narration line 2.5 says so.
3. **AI with citations (loading state).** Sign in → Galaxy S24 → ask *"What is the battery capacity?"*
   > "You see the loading state, then the answer: 4000mAh, citation [1]. Clicking [1] scrolls to the exact spec and its source."

4. **Compare.** Add **iPhone 15** to compare → **Face-off / Table** → ask *"Which has the bigger battery?"*
   > "The S24's 4000mAh is cited, and the iPhone 15's capacity is honestly marked not stated. Apple doesn't publish it."
5. **My Gadgets (Create/Delete on the user side).** On the **catalog card** of Galaxy S24, press **"add to My Gadgets"** (it's on the card, not the phone page) → open **My Gadgets** (1 gadget) → **Remove** → "Your Dashboard Is Empty".
6. **Admin CRUD on real records** (switch to the admin account):
   - **Create:** **+ Add Phone** in the top bar (page `/add`) → **Save Gadget** with everything empty → show the **validation errors** → fill `Name: TekaTech Demo Phone`, `Brand: Demo`, `Category: Smartphone`, `Price: 12345` → Save.
   - **Read:** it appears in the catalog.
   - **Update:** **Edit** → change the price to `12999` → **Save Changes** → the price updates. Optionally **Upload Photo**: "uploads go to Supabase Storage".
   - **Add a spec:** **Add Specs** → `Battery: 5000 mAh` with a source URL → **Index for AI** → "Ready for AI".
   - **Delete:** **Delete** → confirm dialog → gone from the catalog.

   > "Each step is a real request from the React frontend to our FastAPI backend, which writes to Supabase Postgres. We'll see the records in the database next."

   Keep the demo phone **until Part 3** if you want to show it in the table first, then delete it at the end of Part 3.
7. **Error handling (optional, 20 s).** Delete My Account on a member account shows its confirm step. A wrong password shows "Your current password is incorrect." Don't actually delete.

### Part 3 — Database, backend and frontend hosting (4:30–6:30) · *Ikeee-AI*

1. **Database (Supabase, production project).** **Table Editor** → `gadgets` → find **TekaTech Demo Phone** (created in Part 2).
   > "This row was created through the app."

   Open `spec_documents` → filter `gadget_id` → the spec and its `embedding` / `indexing_status = indexed`.

   **Relationships:** **Database → Schema Visualizer**:
   - `spec_documents.gadget_id → gadgets` (on delete cascade)
   - `spec_corrections → spec_documents`
   - `user_gadgets` and `user_questions` → `gadgets`

   **Logs:** **Logs → API / Postgres** (the Logs Explorer) and show the recent inserts/updates.
2. **Backend (Railway).** Project `tekatech` → API service **Online** → **Deployments** (latest commit = `/version`) → **Logs**: one line per request with method, path, status, duration, request id.
   > "Railway runs our FastAPI app. Each request checks the Supabase session, validates input, then queries Postgres with the service role. Route code is the only access control."

   Open `/version` and `/health/ready` in the browser.
3. **Frontend (Render).** `tekatech-web` → **Events / Deploys** history → the latest **build log** (`vite build`).
   > "Render serves the React build; the CI pipeline triggers it."

   Back on the live site, hard refresh to show it works.

   > "All three are connected: Render frontend → Railway API → Supabase database."

### Part 4 — AI/LLM integration (6:30–8:30) · *Ikeee-AI (AI owner after takeover)*

1. **What and why.**
   > "Phone spec sheets are long and inconsistent. The AI answers a shopper's question **only from the saved, sourced specs** and cites them, so every claim is checkable. It uses OpenAI: text-embedding-3-small to find the right spec chunks in pgvector, and gpt-5-mini to write the answer."
2. **A real request.** **The owner presses F12** (DevTools → **Network**). The browser automation can't open DevTools itself. On the iPhone 15 page ask *"Which chip does it use?"* → click the `query` request → show the **Response**: `answer`, `sources`, `answer_basis: "specs"`, `invalid_citations_removed`.
3. **How the backend validates the output** (show `backend/citations.py` and `backend/routers/query.py` briefly in GitHub):
   > "The backend checks every [n] citation against the snippets that were actually sent and strips any that point nowhere. It counts them. An answer cut off by the token limit is refused with a 503, never shown half-finished. Retrieved spec text is treated as untrusted data in the prompt."
4. **General-knowledge mode** (opt-in, labelled). Tick **Allow General Knowledge** → *"Does the Galaxy S24 support Samsung DeX?"* → the answer starts **"General knowledge: not from saved specs, unverified"** and has no citations.
   > "The model signals NOT_IN_SPECS, and the backend switches to the separately labelled general-knowledge path."
5. **Failures and timeouts.** In a terminal, run (free; every request is refused before any write or AI call):
   ```bash
   python scripts/demo_malformed_requests.py --api-base https://tekatech-api-production-549b48c9.up.railway.app
   ```
   > "Malformed input gets 422, no login gets 401, unknown ids get 404. Never a 500, no stack traces."

   Then show the **failure-drill** CI job (Part 5).
   > "OpenAI timeouts, quota errors, empty or unusable output become a friendly 503 with a request id, tested in CI."

### Part 5 — Tests and evaluations (8:30–10:50) · *Ikeee-AI*

Narration lines 5.1–5.5 (2 min 23 s). Numbers checked 15 Nov on `main` and on the updated worklog branch.

1. **CI test results.** Actions → CI run [43654056969](https://github.com/Ikeee-AI/TekaTech/actions/runs/43654056969) on main → expand:
   - **Backend tests:** pytest, **1,009 passed**;
   - **Frontend lint and build:** Vitest, **634 passed** (60 files);
   - **Browser checks (failure drill):** Playwright, **8 passed**;
   - **Database migrations:** SQL applied twice to a scratch database, then acceptance checks.
2. **A failing test is caught.** Run [43503398807](https://github.com/Ikeee-AI/TekaTech/actions/runs/43503398807) failed in the frontend unit tests (an unhandled `scrollIntoView` error) and was fixed before merge. Show it red, then the green run after.
3. **AI evaluation sets.** `prompts/eval/cases.json` (24 grounded cases: question, expected facts, supporting snippet, abstain flag, override tricks), then `prompts/eval/gk_cases.json` (9 cases), scrolled to **GK-08** and **GK-09** (regressions from the 15 Nov production testing).
4. **The scorer, live, in a terminal** (free, no AI call):
   ```
   python scripts/eval_runner.py --answers prompts/eval/reference_answers.json
   python scripts/eval_runner.py --mode gk --answers prompts/eval/gk_reference_answers.json
   ```
   Both end with **"Targets met"** (GK: 9 of 9). **Say clearly** that these are the hand-written reference answers, so they prove the scorer works, not the model.
5. **Real model scores.** `docs/evidence/eval-s5-2026-11-05.md`: gpt-5-mini on the dev database, 5 Nov, about $0.02.
   - **14 / 24** under the official s3 rules; **19 / 24** under the Sprint 5 scorer.
   - Valid citations **59 / 64 (92%)**. All 5 invalid ones are `[0]`, a stray dev record; the model cited no number it was not given.
   - Main weakness: declining a variant that has no specs on file.
   Close: tests mock OpenAI and Supabase (free, repeatable); production is smoke-tested after every deploy.

### Part 6 — DevOps configuration and rules (10:00–11:30) · *Ikeee-AI (DevOps Engineer)*

1. **Repository rules.** GitHub → **Settings → Branches** → **Add classic branch protection rule** (don't save). GitHub shows: *"Your rules won't be enforced on this private repository until you move to a GitHub Team or Enterprise organization account."*
   > "Our repo is private on GitHub Free, so GitHub's branch protection isn't available. We enforce the rules in the pipeline instead."

   Open `PIPELINE.md` → **"Status 15 Nov 2026"** table.
2. **Enforcement in action.** `ci.yml` → the `main-guard` job: a merged PR approved by **another teammate on its final commit**, and `deploy: needs: [backend, frontend, database, main-guard]`.

   Show run **43607550071**: main guard ❌, deploy skipped, issue **#268** opened automatically.
   > "Unreviewed code never reaches production."

   Show `pr-review.yml` **PR policy**: an issue link is required, `.env` files are refused, SQL changes need instructions.
3. **Pipeline stages and triggers.** `ci.yml`: `on: pull_request`, `push: main`, `workflow_dispatch`.
   - Jobs in parallel: secret scans (tracked files + full-history gitleaks), actionlint, pytest, Vitest, build, Playwright, DB migrations.
   - Then the main guard → deploy (Render hook + Railway CLI) → **smoke test** of the exact live commit, database path and CORS.
4. **Environments and secrets.**
   - GitHub → Settings → Secrets and variables → **Actions**: names only, `RAILWAY_TOKEN`, `RENDER_FRONTEND_DEPLOY_HOOK`.
   - Railway service **Variables**, Render **Environment**: names only, **never reveal values**.
   > "Secrets live only in the hosts and GitHub. CI fails if a key pattern or `.env` file is committed."
5. **History, metrics and optimizations.** Actions history → `docs/devops/metrics.md`: the latest row has PR runs ~1.25 min, main runs ~3.1 min, 95% success, 15 deploys, ~3.3 min from merge to live.
   > "Optimizations: cached dependencies, parallel jobs, cancelling superseded PR runs, SHA-pinned actions."
6. **Release and rollback.**
   - **Releases:** `v1.1.0` and `v1.0.0` (`release.yml`).
   - **Rollback:** `rollback.yml`, run from Actions with a known-good SHA and a reason, then smoke-tested. The procedure is in `docs/deploy-runbook.md`, rehearsed on Railway on 12 Nov.

### Part 7 — End-to-end DevOps workflow, live (11:30–14:30) · *Ikeee-AI + Jopher approves*

Record **in one take**. In the edit, only **speed up** waiting (label it "⏩ sped up"); never cut a stage. Follow **Part B** below.

### Part 8 — Final summary (14:30–15:00) · *Ikeee-AI*

> "TekaTech is about 95% complete. The production site, the AI with citations and validation, about 1,600 automated tests plus AI evaluations, and the CI/CD workflow all work. You just saw a change go from a branch to production through checks, review and an automatic deploy. Remaining: the mixed comparison answer, a photo cache header and a custom email domain. Thank you."

---

## Part B — Part 7 kit (live end-to-end change)

**Before recording:** Jopher is online and ready to approve. You are signed in to GitHub in the browser. A terminal is open in the repo, on an up-to-date `main` with a clean status.

**The harmless change:** a new backend test that checks `/health` (it runs in CI and changes no app behaviour).

```bash
git switch main && git pull
git switch -c tekatech/video-e2e-demo
mkdir -p backend/tests
cat > backend/tests/test_video_e2e_demo.py <<'EOF'
"""Harmless test added live in the final video (Part 7): proves CI runs on a new change."""


def test_health_endpoint_responds(client):
    response = client.get("/health")
    assert response.status_code == 200
EOF
git add backend/tests/test_video_e2e_demo.py
git commit -m "S5-IK: video demo — harmless health test (final video Part 7)"
git push -u origin tekatech/video-e2e-demo
gh pr create --base main --head tekatech/video-e2e-demo \
  --title "S5-IK: video demo — harmless health test (Part 7)" \
  --body "Live end-to-end DevOps demo for the final video (S5-IK). Adds one harmless backend test. No app change, no SQL, no env change." \
  --reviewer s2100932
```

(Or use **Add file → Create new file** in GitHub's web UI on a new branch; the same steps apply. The title must contain `S5-IK` so **PR policy** passes.)

**On camera, in order:**
1. Show the new file and the push.
2. Open the PR.
   > "The pipeline starts automatically."

   **Checks** tab: **PR policy**, **Backend tests** (scroll to the new test passing), **Frontend lint and build**, **Database migrations**, **Browser checks**, **Offline prompt evaluation** if triggered, all running.
3. While checks run, point at the **Merge** area.
   > "Our rule: a teammate approval on the final commit. The main guard enforces it at deploy."
4. **Jopher approves** in his own browser ("Approve", on the latest commit). Refresh the PR: the approval is visible.
5. All green → **Squash and merge**.
6. Actions → the **CI run on main** for the merge commit:
   - **Main guard** ✅ (the summary says "approval on final commit …");
   - **Deploy main after checks** → expand: "Trigger Render frontend deployment", "Deploy backend to Railway", "**Verify live commit, database path and CORS**" ✅.
7. Railway **Deployments**: the new deploy **Active**. Render **Events**: the deploy **Live**.
8. Browser: `/version` shows **the merge commit**. Open the live site and ask one AI question.
   > "Production is still healthy."

**After recording (optional):** keep the test file (it's harmless) or remove it later in a normal reviewed PR.

---

## Rehearsal notes (15 Nov, 08:50)

- **Checked and working on production:**
  - brand shortcut Samsung (4 phones);
  - Galaxy S24 page; the AI answer in about 8 s with a loading state; citation [1] opens the source card (Battery 4000mAh);
  - Add Phone empty submit → "Please fix these 3 fields" (nothing saved);
  - My Gadgets add/remove from the catalog card.
- **Dashboards load, logged in:**
  - Supabase **PRODUCTION** Table Editor (gadgets, spec_documents, spec_corrections, user_gadgets, user_questions, query_history), Schema Visualizer (press **Auto layout** and zoom in), Logs Explorer;
  - Railway `tekatech-api` **Online** with ACTIVE deploy + **View logs**;
  - Render `tekatech-web` **Live** with the deploy list and Deploy Hook trigger.
- **Terminal:** the malformed-request demo runs in a **visible** PowerShell window, ending with "Every request was refused safely". Cases needing a member token show "skipped" (fine).
- **Avoid on camera:** the Railway **Variables** tab and the Render **Environment** page (they show secret values).
- **Before the real take:** clear the admin account's saved chats on Galaxy S24 and iPhone 15 (**New Chat → Delete**). Rehearsal questions were saved there.

## Part C — Pre-flight checklist (1 hour before recording)

**Production health**
- [ ] `/version` returns the latest main commit and `/health/ready` is OK (or ask Claude Code to run `verify-deploy`).
- [ ] The latest CI run on main is green. No open PRs that could merge during recording.
- [ ] The Railway service is Online and the Render deploy is Live.

**Accounts and data**
- [ ] **Admin** account for the CRUD part, signed in in one browser profile.
- [ ] **Member** account (Jopher's or a test account) for the user part. It has enough AI questions left (at least 6 of 20).
- [ ] No leftover "TekaTech Demo Phone" in the catalog (delete it if it's there from a rehearsal).
- [ ] Galaxy S24 and iPhone 15 pages load and their answers are cited (one quick question each).

**Dashboards open in tabs, already logged in**
- [ ] Supabase **production** project (the top bar must say **TekaTech · PRODUCTION**, not TekaTech-dev): Table Editor, Schema Visualizer, Logs.
- [ ] Railway project `tekatech`: Deployments + Logs.
- [ ] Render `tekatech-web`: Events.
- [ ] GitHub: the repo, Actions, `PIPELINE.md`, `ci.yml`, PR #254 / run 43607550071 / issue #268, `docs/devops/metrics.md`, `prompts/eval/`.
- [ ] Terminal in the repo with `main` pulled, for Part 4 (malformed requests) and Part 7.

**Privacy on screen**
- [ ] Never show secret **values** (Railway/Render variables, GitHub secrets: names only), `.env` files or tokens.
- [ ] Close email, chat and other personal tabs. Turn on Windows **Do Not Disturb** (Focus).
- [ ] Prefer the admin/test accounts' emails on screen over personal ones where you can.

**Team**
- [ ] **Jopher** available to approve the Part 7 PR (agree a time).
- [ ] Who speaks which part (see the names on each part). Every member explains their own area.

**Recording (OpenScreen)**
- [ ] Microphone test (no echo); captions on.
- [ ] 1920×1080; browser zoom 110–125% so code and logs are readable.
- [ ] Record Part 7 in one take; record the other parts separately if easier.
- [ ] Edit: speed up the waiting with a label; total ≤ **15:00**.
- [ ] Export MP4 → Google Drive → Share: **Anyone with the link → Viewer** → test the link in a private window.
