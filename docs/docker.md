# Run TekaTech with Docker

This guide is for judges, teammates and anyone who wants to run TekaTech on their own computer without installing Python or Node.js. Docker runs two containers:

| Container | What it is | Address on your computer |
| --- | --- | --- |
| `web` | The React app, built and served by nginx | http://localhost:8080 |
| `api` | The FastAPI backend | http://localhost:8000 (health: http://localhost:8000/health) |

The database and sign-in stay in the team's hosted **Supabase DEV project** (not production), and AI answers come from OpenAI. So the computer needs **internet access** and the settings file described below. Nothing secret is stored in the images.

## For judges: 5 steps

1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop/ (Windows, macOS or Linux) and start it. On Windows, accept the WSL 2 setup if it asks. Check it in a terminal: `docker compose version`.
2. **Get the code.** Either `git clone https://github.com/Ikeee-AI/TekaTech.git` (the repository is private, so you need the access the team gave you), or download the release ZIP from the GitHub Releases page and unzip it.
3. **Add the settings file.** The team sends you a file named `.env` privately. Put it in the project's top folder, next to `docker-compose.yml`. Don't share or upload it: it contains keys.
4. **Start TekaTech.** In a terminal, from that folder:
   ```bash
   docker compose up --build
   ```
   The first build takes about 3–6 minutes. It's ready when the log shows `Uvicorn running on http://0.0.0.0:8000` and the `web` container has started.
5. **Open http://localhost:8080** and sign in with the test account the team gave you.

To stop it, press `Ctrl+C`, then run `docker compose down`. To start again later: `docker compose up` (no rebuild needed).

## What to try

- **Browse without signing in:** the phone catalog, filters, a phone's specs and benchmarks.
- **Signed in:** ask the AI about a phone (the answer streams in with numbered `[1]` citations that jump to their sources); compare 2–5 phones and ask about them; add phones to My Gadgets; suggest a correction. Optional toggles under the question box: *Search the Web* and *Allow General Knowledge*. Answers from those are labelled.
- **With the admin test account (if you were given one):** add or edit a phone, upload a photo, add specs and index them, review corrections, and open the Overview page.

Each regular account has **20 AI questions per day** (5 of them can use web search). Rate limits and daily counts reset whenever the `api` container restarts.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Set OPENAI_API_KEY in .env` (or another `Set … in .env`) when starting | The `.env` file is missing, or in the wrong folder. It must sit next to `docker-compose.yml` and be named exactly `.env` (Windows may hide extensions: check it isn't `.env.txt`) |
| `port is already allocated` | Another program uses 8080 or 8000. Add `WEB_PORT=8081` and/or `API_PORT=8001` to `.env`, run `docker compose up --build` again and open the new port |
| The page loads but phones don't, or the browser console shows a CORS error | You changed a port without rebuilding. Run `docker compose up --build` |
| Sign-in works but AI answers say the service is busy or unavailable | The OpenAI key's daily or spending cap is used up, or OpenAI is down. Browsing still works; tell the team |
| The catalog is empty or shows a message that the database is unreachable | The Supabase DEV project may be paused after a week of no use. Tell the team; it takes a few minutes to wake up |
| A sign-up confirmation email link opens the wrong site | Use the test accounts instead of signing up (email links point to the team's configured site address) |

## For the team: before sending a judge the `.env`

1. **Create a separate OpenAI key** for judges, in its own project, with a low monthly budget. Never reuse the production key. Revoke it after judging.
2. **Use the DEV Supabase project, never production.** The `api` container holds the service-role key, which bypasses Row Level Security. Its values (URL, secret key, publishable key) come from the DEV project's API settings.
3. **Check the DEV catalog** matches what you want judges to see: phones, specs indexed for AI, and benchmarks. The 23-phone catalog and the 130 benchmark rows live in production. Copy them with `cd backend; uv run python scripts/mirror_catalog_to_dev.py --apply --index`: it reads only production's public catalog routes, writes only to DEV (it refuses any other project), skips phones DEV already has, and embeds the copied spec chunks (well under $0.01). Done on 26 Nov 2026: 20 phones, 44 chunks, 106 benchmarks.
4. **Create the judge test accounts** in the DEV project (Authentication → Users → Add user, with "Auto confirm" on). For an admin test account, set `app_metadata.is_admin` with the call in `CLAUDE.md`. Done on 27 Nov 2026: one admin and one member account exist on DEV (passwords kept by the owner, never in the repository).
5. **Send the `.env` privately** (not in the repository, an issue, a PR or a public chat). Fill it from [`.env.example`](../.env.example).

## How it is built

- [`backend/Dockerfile`](../backend/Dockerfile): Python 3.12 slim, dependencies installed exactly from `uv.lock` (`uv sync --frozen --no-dev`), tiktoken encodings downloaded at build time, runs as a non-root user, one uvicorn worker (the in-memory rate limiter is per process), and a health check on `/health`.
- [`frontend/Dockerfile`](../frontend/Dockerfile): `npm ci` and `vite build` with the three public `VITE_*` values as build arguments (Vite bakes them in at build time), then nginx serves `dist/`. [`frontend/docker/nginx.conf.template`](../frontend/docker/nginx.conf.template) gives the same single-page-app rewrite and security headers as `render.yaml`, with `connect-src` pointing at the local API.
- [`docker-compose.yml`](../docker-compose.yml) wires them together. CORS on the API allows `http://localhost:<WEB_PORT>`, and the web app calls `http://localhost:<API_PORT>`.
- The `.dockerignore` files keep `.env` files, virtual environments and `node_modules` out of the build.
- CI: [`.github/workflows/docker.yml`](../.github/workflows/docker.yml) builds both images and starts them with dummy values on PRs that touch the Docker files. It checks health, `/version`, the 401 on anonymous AI requests, CORS, the non-root user, the security headers, the SPA rewrite, and that no backend-only value ends up in the frontend build.

Production is unchanged: the API still deploys to Railway and the frontend to Render through `ci.yml`. These images are for running TekaTech elsewhere.

## Hands-on check (27 Nov 2026)

Run on the owner's Windows laptop with Docker Desktop 29.9.3, from this branch rebased on `main` (448aa01), against the DEV project, plus the API change from PR #302 applied locally to check the General Knowledge fix:

- `docker compose up --build`: both containers healthy. `/health` ok, `/version` `docker-local`, 23 DEV phones, anonymous `POST /query` 401, SPA rewrite, CORS for `http://localhost:8080`, API runs as the non-root user.
- Signed out: catalog loads; a phone page sends the visitor to log in.
- Member account: grounded answer with citation; General Knowledge answer (labelled, no citations); web answer (labelled, cites a page); compare AI answer citing both phones; share link; My Gadgets add and remove; daily counter 20 → 17; `/admin` sends a member back to the catalog; no console errors.
- Admin account: overview; add a test phone → add spec (saved pending) → index → AI answer cites it → add benchmark → edit price → suggest a correction → approve it (applied and re-indexed) → web benchmark drafts on a real phone (nothing saved) → delete the test phone (API 404 afterwards, DEV back to 23 phones).
