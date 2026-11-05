# Fresh-checkout regression check, 5 Nov 2026 (S5-JO)

Run by Jopher (`s2100932`, AI-assisted: yes, Claude Code). Purpose: the S5-JO "fresh-checkout regression record". It shows a new contributor can still start and test the current `main` from the README alone, after the Sprint 5 changes (admin-curated catalog #195, My Gadgets #197, gadget chat #210, spec cards #211, Compare Add Gadget #222). Previous record: [fresh-checkout-2026-10-29.md](fresh-checkout-2026-10-29.md).

**Machine:** Windows 10 Pro, Git 2.51.2, Node **24.14.1** / npm 11.11.0. `uv` was **not** installed, so this time it was installed with the README's own command.
**Code:** a fresh `git clone https://github.com/Ikeee-AI/TekaTech.git` of `main` at **`e3852b9`**, into an empty temporary folder (not the working copy).
**Database:** TekaTech-dev (`efdgguybkampozuvqjrz`). Both `.env` files hold the dev values (not shown); their Supabase host was checked to be the dev project before use. Never production.
**Pilot:** not started yet ("on hold" in the Sprint 5 log), so this is the pre-pilot run. Rerun it after the pilot fixes.

| Step (README command) | Result | Time |
| --- | --- | --- |
| `git clone …` | OK, `e3852b9` | 4 s |
| Install uv (`irm https://astral.sh/uv/install.ps1 \| iex`) | OK, **uv 0.13.7**. The installer says to restart the shell for PATH; the README already says "open a new terminal" | 23 s |
| `backend`: `uv sync --frozen` | OK. uv picked **Python 3.12.10** by itself | 7 s |
| `uv run --frozen pytest` | **679 passed**, 1 warning (from the `anyio` pytest plugin about pytest 10, not our code) | 16 s |
| `python ../scripts/check_secrets.py` | passed | — |
| `uv run --frozen python -c "from main import app"` | OK (`TekaTech API`) | — |
| `frontend`: `npm ci` | OK, 242 packages; **`EBADENGINE` warnings**, see gap 1 | 22 s |
| `npm run lint` / `npm test` / `npm run build` | clean / **324 passed** (31 files) / built | 16 s together |
| `npx playwright install chromium` | Downloaded Chrome Headless Shell **v1248** and FFmpeg | 43 s |
| `npm run test:e2e` | **8 passed** (failure-drill browser checks, faked API) | 15 s |
| `uvicorn main:app` (port 8000) + `npm run dev -- --port 5173 --strictPort` | Both started from the clone | — |
| `GET /health/ready` | 200, `"database":"ok"` (1.4 s, first call) | — |
| `GET /version` | `{"commit":"local"}`, as the troubleshooting guide says for a non-Render run | — |
| Browser: catalog | 13 dev gadgets; filters and Popular Questions load, so CORS from `http://localhost:5173` works | — |
| Browser: iPhone 15 → suggested **"What chip does it use?"** | **"The iPhone 15 uses the A16 Bionic chip [1]"**, "Answer based on 1 cited spec", 5 sources retrieved. One small dev OpenAI call | ~10 s |

`git status` in the clone stayed clean, so both `.env` files are still ignored.

**Compared with 29 Oct:** the same steps work. Tests grew from 491 to **679** (backend) and from 199 to **324** (frontend). The Playwright browser checks now run in a fresh setup too.

## README gaps found, and fixed in the same PR
1. **Node version.** The README said "Node.js 22+ (Node 24 also works)". Two test-only packages (`@asamuzakjp/css-color`, `@asamuzakjp/dom-selector`, used by jsdom) now require `^22.22.2 || ^24.15.0 || >=26`, so `npm ci` on 24.14.1 prints `EBADENGINE` warnings. Everything still installed and passed. The README now says 22.22.2+ or 24.15+, and that older versions only warn.
2. **The Playwright browser step said "first time only".** The browser must match the installed Playwright version. On my usual working copy, an older Chromium (v1243) failed with "Executable doesn't exist … chromium_headless_shell-1248" after a Playwright update, until `npx playwright install chromium` was run again. The README now says "first time, and again after Playwright is updated".

## Not covered here
- `seed_dev.py` on an empty database: dev was already seeded (13 gadgets). The script's dev-only guard is tested in `backend/tests`.
- Signed-in journeys from the clone (My Gadgets, saved chat, admin pages). The acceptance rerun after the pilot covers them.
- macOS/Linux: the commands are PowerShell; only Windows was checked.
