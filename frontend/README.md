# TekaTech frontend

React + Vite frontend for TekaTech — browse/add gadgets, manage verified specs, compare gadgets side by side, and ask AI questions grounded in real spec data. See the [project root README](../README.md) for the full picture (backend included, overall data flow, current status).

## Setup

Requires Node.js.

```bash
npm install
```

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # the publishable/anon key — safe for the browser, not the secret key
VITE_API_BASE_URL=http://127.0.0.1:8000     # optional; this is the default
```

Get the Supabase values from Supabase → Project Settings → API Keys. The anon/publishable key is a separate key from the backend's `supabase_key` (which is the secret/service-role key) — mixing them up either breaks the frontend or leaks admin access to the browser. Everything in this file ships to the browser, so only public values belong here.

## Running

```bash
npm run dev      # http://localhost:5173
```

The backend (`../backend`) must be running separately. `src/api/client.js` targets `VITE_API_BASE_URL`, falling back to `http://127.0.0.1:8000` when unset — so local dev needs no extra config. The backend's `cors_origins` setting must include whatever origin this dev server actually runs on (defaults to `localhost:5173`; Vite will pick a different port like 5174 if 5173 is already taken, which will then fail CORS unless you also add that origin backend-side).

Vite inlines `VITE_*` variables at build time, so after changing `.env` you must restart the dev server (or rebuild) for it to take effect.

```bash
npm run build     # production build to dist/
npm run lint      # eslint
```

## Structure

```
src/
  main.jsx              entry point — wraps App in AuthProvider
  App.jsx                routes + top nav
  supabaseClient.js       Supabase JS client (auth only — data goes through the backend)
  api/client.js           thin fetch wrapper for the FastAPI backend; attaches the
                          Supabase session's access token as a Bearer header

  context/AuthContext.jsx  AuthProvider (Supabase auth state)
  context/authContextValue.js  the raw React context object (split out so
                          AuthContext.jsx can stay component-only for Fast Refresh)
  hooks/useAuth.js         useAuth() hook — reads AuthContext
  hooks/useAiAnswer.js     shared state/behavior behind the two AI panels below
  hooks/useDocumentTitle.js

  pages/
    GadgetList, GadgetDetail, AddGadget, EditGadget   gadget CRUD + browsing
    ComparePage                                        side-by-side comparison + AI trade-offs
    ShortLinkRedirect                                  resolves /c/:slug -> /compare?ids=...
    AdminCorrections                                    review queue for spec corrections (auth-protected)
    Login, NotFound

  components/
    SpecManager            add/list spec chunks for a gadget, suggest corrections
    AIAnswerPanel, AIComparisonPanel   AI Q&A UI (single gadget vs. comparison scope)
    AiAnswerResult          shared result/sources/footer UI used by both panels above
    ProtectedRoute          redirects to /login if not authenticated
    TrendingQuestions, EmptyState, Skeleton, AnswerText
```

## Auth

Login/signup goes straight to Supabase (`AuthContext.jsx`) — the backend never sees a password, only the resulting JWT (as a Bearer token, attached automatically by `api/client.js`). Routes that mutate data (`/add`, edit, `/corrections`) are wrapped in `ProtectedRoute`; browsing and asking AI questions never require an account.
