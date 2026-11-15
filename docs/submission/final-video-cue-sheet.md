# TekaTech final video — cue sheet

**How we record:** you click and navigate; I start/stop OpenScreen and play your cloned voice. Say **"go <part>"** → I start recording and play the first line → do the action → type **`n`** for the next line → **`stop`** ends the clip. Cut the pauses in the OpenScreen editor.

**Always:** Chrome in front, zoom 100%, no other tabs with personal info, notifications off. Never show Railway Variables, Render Environment or secret values.

## Part 1 — Introduction and progress  (1.0 min voice) ✅ RECORDED (part1.openscreen)

**Prepare:**
- Signed out, home page at the top.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 1.1 | 20s | Hello. This is TekaTech, a phone catalog that helps Filipino shoppers understand and compare phone specifications. Every spec links to the brand's official page, and our A I answers only from those saved specs, with numbered sources you can click. | Live home page. |
| 1.2 | 29s | TekaTech is about ninety five percent complete. Working today: the catalog with sourced prices, sign in and accounts, admin create, read, update and delete for phones and specs, photo upload, corrections, My Gadgets, A I questions with citations, comparisons, an optional general knowledge mode, and an automated pipeline that deploys to Railway and Render. | Scroll the catalog slowly. |
| 1.3 | 14s | What remains is polish: a mixed comparison answer, a cache header for uploaded photos, and a custom email domain so confirmation emails stop landing in spam. | Stay on the catalog. |

## Part 2a — Walkthrough, signed out  (0.7 min voice) ✅ RECORDED (part2a.openscreen)

**Prepare:**
- Done: Samsung filter, S24 featured card, 'Sign in to continue' pop-up, weak-password checklist.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 2.1 | 16s | Part two, the system walkthrough, on the deployed website. Let's follow a shopper choosing between two phones. First, browsing: filters by brand and price, and each phone card shows sourced key specs. | Filter by brand Samsung, then clear. |
| 2.2 | 14s | Here is the Galaxy S twenty four. Every key spec shows where it came from. The price shows its source and the day it was checked, and the release date comes from Samsung's newsroom. | Open Galaxy S24 page. |
| 2.3 | 10s | Asking the A I needs an account, so visitors can only browse. On sign up, the password checklist validates the password as you type. | Signed-out view of Ask AI, then the Sign Up checklist with a weak password (not submitted). |

## Part 2b — Walkthrough, signed in (Part 2b = lines 2.4–2.12)  (1.7 min voice) ⏳ NEXT

**Prepare:**
- Log in as **admin** BEFORE recording (password off camera).
- Galaxy S24 page has no saved chat (already cleared).
- Demo phone values: Name **TekaTech Demo Phone** · Brand **Demo** · Category **Smartphone** · Price **12345** → later edit to **12999**.
- Spec for 2.11: Battery **5000 mAh**, source URL e.g. `https://www.samsung.com/ph/` → **Index for AI**.
- My Gadgets: use the **Save** button on the Galaxy S24 **catalog card** (not the phone page).
- Add Phone is the **+ Add Phone** button in the top bar (`/add`).

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 2.4 | 10s | Now signed in, we ask: what is the battery capacity? Notice the loading state while the backend searches the spec sheets. | Ask the battery question on Galaxy S24. |
| 2.5 | 17s | The answer is four thousand milliamp hours, with citation one. Clicking the citation scrolls to the exact spec and its official source. Members can ask twenty A I questions per day; this admin account is not limited. | Click citation [1]. |
| 2.6 | 17s | Next, compare. We add the iPhone fifteen and ask which has the bigger battery. The Galaxy's four thousand milliamp hours is cited, and the iPhone's capacity is honestly marked as not stated, because Apple does not publish it. | Compare iPhone 15 vs Galaxy S24, ask the battery question. |
| 2.7 | 5s | Users can save phones to My Gadgets, and remove them again. | Save S24 to My Gadgets, open My Gadgets, remove. |
| 2.8 | 11s | Now the admin side, with real database records. Create: if required fields are empty, the form shows validation errors before anything is sent. | Admin: Add Phone, submit empty, show errors. |
| 2.9 | 8s | We fill in a demo phone and save it. It now appears in the catalog. That is create and read. | Fill TekaTech Demo Phone / Demo / Smartphone / 12345, save, show it. |
| 2.10 | 7s | Update: we edit the price and save. The new price is stored and shown right away. | Edit price to 12999, save. |
| 2.11 | 12s | Admins also add specs with their source link, then index them so the A I can use them. Saving never needs the A I, so an A I outage never loses data. | Add Specs: Battery 5000 mAh + source URL; Index for AI. |
| 2.12 | 14s | Every step you saw is a request from the React frontend to our FastAPI backend, which writes to the Supabase Postgres database. Let's look at those records directly. | Keep the demo phone for Part 3. |

## Part 3 — Database, backend and frontend hosting  (1.7 min voice) 

**Prepare:**
- Supabase **PRODUCTION** project `lqswcmkzygqmnblaukco`: Table Editor, Schema Visualizer (press **Auto layout**), Logs Explorer.
- Railway `tekatech-api` → Deployments → **View logs**. ⚠️ Never open the **Variables** tab.
- Render `tekatech-web` → deploy list / build log. ⚠️ Never open **Environment**.
- URLs for 3.6: `https://tekatech-api-production-549b48c9.up.railway.app/version` and `https://tekatech-api-production-549b48c9.up.railway.app/health/ready`.
- 3.4 deletes the demo phone in the app, then refresh the Supabase gadgets table.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 3.1 | 15s | Part three, hosting. The database is Supabase, using Postgres with the pgvector extension. In the production project, the gadgets table holds the demo phone we just created through the app. | Supabase PRODUCTION → Table Editor → gadgets → the demo row. |
| 3.2 | 21s | Its spec is in spec documents, with the vector embedding and the indexed status. The schema shows the relationships: spec documents belong to a gadget, corrections belong to a spec, and My Gadgets and saved questions link users to gadgets, all with cascading deletes. | spec_documents row; Schema Visualizer. |
| 3.3 | 3s | Database activity is visible in the logs. | Logs explorer, recent API / Postgres entries. |
| 3.4 | 10s | Now delete. We remove the demo phone in the app, and its row and its spec disappear from the database, because of the cascade. | Delete demo phone in the app; refresh the Supabase table. |
| 3.5 | 26s | The backend runs on Railway. The service is online, here is the deployment history, and here are the runtime logs, one line per request with the path, status, duration and a request id. Each request checks the user's session, validates the input, and then queries Postgres. The route code is the only access control. | Railway: service Online, Deployments, Logs. |
| 3.6 | 11s | The live version endpoint shows the exact commit that is deployed, and the readiness check confirms the database connection. | Open /version and /health/ready. |
| 3.7 | 13s | The frontend is a React build served by Render. Here is the deploy history and the build log. Frontend, backend and database are all connected and working. | Render: Events, latest build log; back to the live site. |

## Part 4 — AI / LLM integration  (1.8 min voice) 

**Prepare:**
- iPhone 15 page, signed in as admin; no saved chat (already cleared).
- 4.2: **you press F12** → Network tab, then ask *Which chip does it use?* → click the `query` request → Response.
- 4.3: GitHub `https://github.com/Ikeee-AI/TekaTech/blob/main/backend/citations.py`.
- 4.4: Galaxy S24 → tick **Allow General Knowledge** → ask *Does it support Samsung DeX?*
- 4.5: I open a terminal window running `python scripts/demo_malformed_requests.py --api-base https://tekatech-api-production-549b48c9.up.railway.app`.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 4.1 | 16s | Part four, the A I integration. Phone spec sheets are long and inconsistent. Our A I answers a shopper's question only from the saved, sourced specs, and cites them, so every claim can be checked. | iPhone 15 page. |
| 4.2 | 15s | We use OpenAI. The text embedding three small model finds the right spec chunks in pgvector, and G P T five mini writes the answer. Here is a real request: which chip does it use? | Ask 'Which chip does it use?' with DevTools Network open. |
| 4.3 | 29s | The response contains the answer, the sources, and the answer basis. The backend validates the output before it is shown: every citation number is checked against the snippets that were actually sent, and invalid ones are removed and counted. An answer cut off by the token limit is refused, never shown half finished. Spec text is treated as untrusted data in the prompt. | Show the query response JSON; briefly citations.py in GitHub. |
| 4.4 | 18s | Users can also allow general knowledge. When the saved specs do not cover a question, the model signals not in specs, and the backend switches to a separate, clearly labelled general knowledge answer, with no citations. | Galaxy S24, Allow General Knowledge, ask about Samsung DeX. |
| 4.5 | 31s | Failures are handled safely. This script sends malformed and unauthorized requests to the live A P I. Bad input is refused with four twenty two, a missing login with four oh one, an unknown id with four oh four. Never a server error, and no stack traces. Model timeouts, quota errors and unusable output become a friendly error with a request id, and that is tested in our pipeline. | Terminal: python scripts/demo_malformed_requests.py --api-base <prod>. |

## Part 5 — Tests and evaluations  (2.4 min voice) 

**Prepare:**
- CI run on main: https://github.com/Ikeee-AI/TekaTech/actions/runs/43654056969 · failing run: https://github.com/Ikeee-AI/TekaTech/actions/runs/43503398807
- Files: `prompts/eval/cases.json`, `prompts/eval/gk_cases.json` (GK-08, GK-09), `docs/evidence/eval-s5-2026-11-05.md`.
- 5.4: I open a terminal running the two `eval_runner.py` commands (free, no AI cost).

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 5.1 | 34s | Part five, tests and evaluation. Every pull request and every merge runs the C I pipeline. On the latest run on main: one thousand and nine backend tests with pytest, six hundred and thirty four frontend tests with Vitest, eight browser tests with Playwright that simulate A I failures, and the database migrations applied twice to a scratch database. About sixteen hundred and fifty automated tests, all passing. | Actions → CI run 43654056969 on main → expand Backend tests (1009 passed), Frontend lint and build (634 passed), Browser checks (8 passed), Database migrations. |
| 5.2 | 9s | Failures are real and visible. This earlier run failed in the frontend unit tests and was fixed before it was merged. | Run 43503398807 red, then the green run. |
| 5.3 | 25s | The A I has its own evaluation sets: twenty four grounded questions and nine general knowledge cases. Each case has the question, the expected facts, the supporting source, and whether the model should decline. They include trick questions that try to override the rules, and regression cases from our own production testing. | prompts/eval/cases.json, then gk_cases.json scrolled to GK-08 and GK-09. |
| 5.4 | 27s | Now the scorer, live. It checks that facts are supported, that every citation points to a real source, that the model declines when it should, and that it resists override attempts. These are our hand written reference answers, so this proves the scorer itself works, at no A I cost. The same offline check runs in C I on every prompt change. | Terminal: python scripts/eval_runner.py --answers prompts/eval/reference_answers.json, then --mode gk --answers prompts/eval/gk_reference_answers.json → Targets met, 9 of 9. |
| 5.5 | 47s | Real model results are scored separately. On November fifth, G P T five mini on our dev database scored fourteen of twenty four under the official rules, and nineteen of twenty four under the improved Sprint five scorer, for about two cents. Ninety two percent of citations were valid; the rest pointed to one stray test record, and the model never cited a source it was not given. The misses are documented, mainly declining a phone variant we have no specs for. Tests mock OpenAI and Supabase, so they are free and repeatable, and production is smoke tested after every deploy. | docs/evidence/eval-s5-2026-11-05.md → results table and rescorings table. |

## Part 6 — DevOps configuration and rules  (2.4 min voice) 

**Prepare:**
- GitHub → Settings → Branches → **Add classic branch protection rule** (don't save) to show the 'won't be enforced' warning.
- `PIPELINE.md` status table · `.github/workflows/ci.yml` (main-guard, deploy needs) · blocked run https://github.com/Ikeee-AI/TekaTech/actions/runs/43607550071 · issue #268.
- Secrets page: **names only**, never click into a value.
- `docs/devops/metrics.md` rows 'Sprint 5 final' and 'Post-Sprint 5' · Releases (https://github.com/Ikeee-AI/TekaTech/releases, v1.1.0) · `rollback.yml` · `docs/deploy-runbook.md`.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 6.1 | 17s | Part six, DevOps configuration. Our repository is private on GitHub Free, so GitHub's branch protection is not available. We enforce the rules in the pipeline instead, as documented in our pipeline file. | GitHub Settings → Branches (upgrade message); PIPELINE.md status table. |
| 6.2 | 31s | The main guard job requires a merged pull request approved by another teammate on its final commit, and the deploy job depends on it and on all checks. Here it blocked a real change: the deploy was skipped and an issue was opened automatically. Unreviewed code never reaches production. A pull request policy also requires a linked task and rejects environment files. | ci.yml main-guard + deploy needs; run 43607550071; issue #268; pr-review.yml. |
| 6.3 | 27s | The pipeline runs on pull requests, on pushes to main, and on demand. Jobs run in parallel: secret scanning of files and the full git history, workflow linting, backend and frontend tests, the build, browser checks and database migrations. Then the main guard, the deploy to Render and Railway, and a smoke test of the exact live commit. | ci.yml triggers and job list. |
| 6.4 | 13s | Secrets live only in GitHub and the hosting dashboards. We show the names, never the values. C I fails if a key or an environment file is ever committed. | GitHub Actions secrets page (names only). |
| 6.5 | 39s | We track pipeline metrics each week. Over Sprint five: about one point two minutes per pull request run, about three and a quarter minutes on main, ninety nine percent success over one hundred and fourteen runs, fifty three production deploys, and under three minutes from merge to live. Since then one deploy failed, from an invalid token, and the next good deploy came eleven minutes later. Optimizations include caching, parallel jobs, cancelling outdated runs and pinned actions. | docs/devops/metrics.md → rows 'Sprint 5 final' and 'Post-Sprint 5'. |
| 6.6 | 14s | Releases are tagged, here version one point one. Rollback is a workflow that redeploys a known good commit and smoke tests it. It is documented in the runbook and was rehearsed on Railway. | Releases page; rollback.yml; deploy-runbook.md. |

## Part 7 — End-to-end DevOps workflow, LIVE  (1.4 min voice) 

**Prepare:**
- **Jopher on standby** to approve the PR (needs approval on the final commit).
- I run the branch/test/commit/push/PR commands in a visible terminal (kit in `docs/submission/final-video-script.md`, Part B).
- **You say 'merge'** when approved; the deploy takes a few minutes (cut/speed up in editing).
- End: `https://tekatech-api-production-549b48c9.up.railway.app/version` shows the merge commit + one AI question on the live site.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 7.1 | 10s | Part seven, the end to end workflow, live. We create a branch and add a harmless test that checks the health endpoint. | Terminal: branch + new test file. |
| 7.2 | 7s | We commit, push, and open a pull request. The pipeline starts automatically. | commit, push, gh pr create; PR Checks tab. |
| 7.3 | 16s | All configured stages are running: the pull request policy, backend tests including our new test, frontend lint and build, database migrations and browser checks. Waiting is sped up in this recording. | Checks running; new test visible in the backend log. |
| 7.4 | 10s | The checks pass. Our rule requires a teammate's approval on the final commit, so a teammate now reviews and approves. | Jopher approves; refresh PR. |
| 7.5 | 10s | We merge into main. This triggers the main pipeline: the guard confirms the approval, then the deploy starts automatically. | Squash and merge; Actions main run; main guard summary. |
| 7.6 | 17s | The deploy sends the backend to Railway and the frontend to Render, then verifies the live commit, the database path and C O R S. Railway shows the new deployment active, and Render shows the deploy live. | Deploy job steps; Railway Deployments; Render Events. |
| 7.7 | 12s | The live version endpoint now shows the merged commit, and the site still works. That is the complete path from a code change to production. | /version = merge commit; live site, one AI question. |

## Part 8 — Final summary  (0.5 min voice) 

**Prepare:**
- Live home page.

| Line | Voice | Narration (what you'll hear) | You do |
|---|---|---|---|
| 8.1 | 31s | To summarize: TekaTech is about ninety five percent complete. The production site, the A I with citations and output validation, more than sixteen hundred automated tests with A I evaluations, and the DevOps workflow are all working, as you just saw. What remains is polish: a mixed comparison answer, a photo cache header, and a custom email domain. Thank you for watching. | Live home page. |

**Total voice:** 13.5 min (limit 15 min).