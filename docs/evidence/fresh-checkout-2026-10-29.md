# Fresh-checkout setup check, 29 Oct 2026 (S4-JO)

Run by Jopher (`s2100932`, AI-assisted: yes). Purpose: prove that the README "Run locally" steps work from a clean clone, and fix the README where they didn't.

**Machine:** Windows 10 Pro, Git 2.51.2, Node 24.14.1 / npm 11.11.0, system Python **3.11.9**. `uv` was not installed, so `uv 0.13.6` was installed into a throwaway venv for this check.
**Code:** fresh `git clone https://github.com/Ikeee-AI/TekaTech.git` of `main` at `f1e6151`.
**Database:** TekaTech-dev (`efdgguybkampozuvqjrz`). Both `.env` files were copied from `.env.example`, then filled with the dev values (not shown). Never production.

| Step (README command) | Result | Time |
| --- | --- | --- |
| `git clone …` | OK | 3 s |
| `backend`: `uv sync --frozen` | OK. uv picked **Python 3.12.10** even though the system Python is 3.11 | 6 s |
| `uv run --frozen pytest` | **491 passed** | 14 s |
| `uv run --frozen python -c "from main import app"` | OK | — |
| `frontend`: `npm ci` | OK, 242 packages | 24 s |
| `npm run lint` / `npm test` / `npm run build` | clean / **199 passed** / built | < 10 s |
| `uvicorn main:app` + `npm run dev -- --port 5173 --strictPort` | Both started | — |
| `GET /health/ready` | 200, `"database":"ok"` | — |
| `GET /docs` | 200 | — |
| `GET /gadgets` | 200, 13 dev gadgets | — |
| CORS preflight from `http://localhost:5173` | 200, `access-control-allow-origin: http://localhost:5173` | — |
| Browser: catalog → iPhone 15 → "What chip does it use?" | Cited answer "The iPhone 15 uses the A16 Bionic chip [1]"; no console errors | ~10 s |

`git status` in the clone stayed clean, so both `.env` files are ignored as intended.

## README gaps found, and fixed in the same PR
1. **`uv` install was not explained.** The README now gives the Windows install command and the official link.
2. **"Python 3.12+" read as a manual install.** In practice `uv sync` finds or downloads 3.12 on its own (here with a 3.11 system Python). The README now says so.
3. **Where the `.env` values come from** was missing. Now: the TekaTech-dev values from Ikeee-AI, and never production keys locally.
4. **No "is it working?" step.** Added `/health/ready`, the catalog, and one cited question as the end-to-end check, plus a short troubleshooting list (CORS port, `VITE_*` rebuild, paused Supabase, `uv` not found).
5. **Checks section was out of date.** Added the secret guard, `npm test` (Vitest) and `npm run test:e2e` (Playwright). Moved the Ollama probe out (historical only since 16 Oct).

## Not covered here
- `seed_dev.py` on an empty database: dev was already seeded (13 gadgets), and re-seeding was not needed. The script's dev-only guard is tested in `backend/tests`.
- macOS/Linux: the commands are PowerShell; only Windows was checked.
