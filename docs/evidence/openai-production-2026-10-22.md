# OpenAI restored: local and production checks (22 October 2026)

Recorded by Ikeee-AI (S3-IK). Times are Asia/Manila (UTC+8). No key values, request bodies with personal data or screenshots containing account emails are stored here.

## Keys (values never recorded)

| Key name | Ends in | Used by | Status |
| --- | --- | --- | --- |
| `TekaTech_Render` | `u8QA` | Render `tekatech-api` (`OPENAI_API_KEY`) | Active; dashboard shows last used 22 Oct after the live checks |
| `TekaTech_Credit` | `GngA` | Local development `backend/.env` | Active |
| `TekaTech_Smoke` | `W-sA` | GitHub repo secret `OPENAI_SMOKE_API_KEY` (weekly smoke job, #79) | Active; secret set 23 Oct 00:28 Manila |
| `TekaTech_Latest` | `3DQA` | Local `.env` before the rotation | Revoked 22 Oct after Usage showed only 1 embeddings request / 9 tokens (the 18:08 check) and no chat use |
| `TekaTech_Latest` | `OTIA` | Unused spare | Revoked, never used |
| `TekaTech` | `MF0A` | Original key (4 Sep 2026) | Revoked |

All keys are in the Default project with Restricted permissions (model capabilities only), the project limited to `text-embedding-3-small` and `gpt-5-mini`. Keys expire 21 Dec 2026, after the project ends.

## Spending controls

- **Hard cap: prepaid credit.** API credit balance $10.00 with auto-reload **off**; requests stop when the balance reaches $0 (the Sprint 1 `credit_balance_exhausted` behavior). Maximum possible spend is the remaining balance.
- **Organization spend limit: $10/month, shown as "Limit not enforced"** — it sends email alerts only (at 50% = $5 and 100% = $10) and does not block requests.
- One shared budget for production and development (environment gap E4, partly mitigated).

## Checks

| Time | Check | Result |
| --- | --- | --- |
| 18:08 | `scripts/sprint1_check.py --ai` (local, TekaTech-dev), old local key | Passed: 1536-dim embedding, 9 tokens. [JSON](openai-local-2026-10-22.json) |
| ~22:30 | Same check with `TekaTech_Credit` | Passed: 9 tokens, request `req_d3a2d0f138644cf9a543d44ed7f26ce9` |
| 22:38 | `scripts/deployed_smoke.py` after Render key rotation | Passed: commit `096f8f2` = main, `/gadgets` = 3, CORS passed, first attempt |
| 23:01 | Live `POST /query` (Poco X7 Pro, no specs on file) | HTTP 200 in 9.2 s (includes wake-up); safe "no spec information" answer, `model_used: none`. Proves the Render key works for embeddings; no row written on this path |
| 23:16 | Live site, browser: added Apple iPhone 15 with spec text from `prompts/eval/sources.json` (source https://support.apple.com/en-us/111831), indexed it, asked "What are the key specs of the Apple iPhone 15?" | Grounded answer with `[1]` citations and one source card (56% match) |

## Grounding check of the 23:16 answer

| Claim | Supported by source [1] |
| --- | --- |
| 6.1-inch OLED, 2556-by-1179, 460 ppi, 2000 nits outdoor | Yes |
| A16 Bionic chip | Yes |
| 48MP Main f/1.6 and 12MP Ultra Wide f/2.4 | Yes |
| Video playback up to 20 hours; USB-C with USB 2 (480Mb/s); MagSafe and Qi2 up to 15W | Yes |
| IP68, 6 metres up to 30 minutes, IEC 60529 | Yes |

Supported claims: 5/5. Valid citation references: 3/3 (all `[1]`, one source). Sample size is one question; this is an acceptance smoke check, not an evaluation score (that is S3-AD, #54).

## Observations for owners

- Catalog category filter lists `smartphone` and `Smartphone` separately (inconsistent stored values) — Jopher/Mika.
- The chat call sets no `max_completion_tokens` or `reasoning_effort`, so output cost per answer is unbounded — Manuel (#56, #59).
