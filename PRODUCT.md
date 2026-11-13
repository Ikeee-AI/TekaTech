# Product

<!-- impeccable:product-schema 1 -->

<!-- Written 13 Nov 2026 by Ikeee-AI (AI-assisted, Claude Code) with the Impeccable `init` guide, for the
UI rebrand. Facts come from the repository and three owner answers (13 Nov). This file is product truth
only: no visual world, palette, typography or page concepts. Those belong in DESIGN.md, written later. -->

## Platform

web

## Users

**Primary: Filipino gadget shoppers** (confirmed by the owner, 13 Nov 2026). People in the Philippines deciding which phone or gadget to buy. They check a model's specifications and compare models before purchase, usually as non-experts. Prices are shown in Philippine pesos (₱), and the catalog is mostly phones sold in the Philippines.

Secondary audiences, not the design target:
- **Members:** signed-in users who keep a My Gadgets shortlist, keep a saved AI conversation per gadget and suggest spec corrections.
- **Admins:** the TekaTech team, who curate the catalog (add and edit gadgets, add and index specs, review corrections, read the admin overview).
- **Course evaluators:** TekaTech is a CSP221A course project; the instructor and Demo Day panel see it, but they are not who the product is designed for.

## Product Purpose

TekaTech helps shoppers understand and compare gadget specifications. It stores specs taken from official sources, retrieves the relevant ones for a question, and gives AI answers in which **every fact links to the saved spec it came from**, so the shopper can check it.

Success: a shopper gets a correct, checkable answer about a gadget, or a clear "No Evidence Found" when TekaTech has no spec for it, and can compare two to five gadgets side by side.

## Positioning

Answers are grounded only in TekaTech's own saved, sourced specs and carry numbered, clickable citations. When there is no evidence, TekaTech says so instead of guessing. An optional general-knowledge answer exists, off by default, and is clearly labelled as unverified and uncited. The catalog is curated by the team, and user corrections reach answers only after admin review.

## Operating Context

- **Visitors (no account):** browse and filter the catalog, open a gadget, ask about it (suggested questions or up to 150 characters), compare 2–3 gadgets, generate an AI trade-off comparison, and share a comparison by short link (`/c/…`).
- **Members:** My Gadgets dashboard (add from the catalog, compare 2–5, ask across them), a saved per-gadget AI conversation (New Chat, Regenerate), My Suggestions, and an account page (email, role, change password; delete account is in progress, #213/#254).
- **Admins:** Add Gadget, Edit, Add Specs, Index for AI / Index All Pending, Review Queue (corrections), and the Admin Overview (#206).
- Answers can take several seconds; the AI panel has loading, timeout, unavailable and unusable-response states, and keeps the user's question.
- Usage spans phone and desktop; the plan's acceptance widths are 360 px and 1280 px.

## Capabilities and Constraints

- **Stack:** React 19, Vite, Tailwind CSS 4 frontend (static, on Render); FastAPI backend (Railway); Supabase Postgres + pgvector + Auth. The browser talks to Supabase for sign-in only.
- **Answer rendering is coupled to the prompt.** `AnswerText.jsx` renders exactly three things: `[n]` citations, `**bold**` and `- ` bullets. Any visual change keeps citations as numbered, clickable, keyboard-accessible markers that scroll to their source card. Changing what answers may contain means changing the prompt and the renderer together.
- **States must stay distinguishable:** a grounded answer, "No supporting source cited", "No Evidence Found", a general-knowledge answer (labelled), and provider failures (timed out, unavailable, unusable).
- **Admin-only controls** are shown only to admins (`app_metadata.is_admin`).
- **Terminology in use:** Catalog, Compare, My Gadgets, Review Queue, Overview, Add Gadget, Add Specs, Index for AI, Index All Pending, Suggest a correction, My Suggestions, Plain-Language Answer, No Evidence Found, Sources Retrieved, Share.
- **Lint conventions** in `CLAUDE.md` (fetch-on-mount pattern, the AuthContext three-file split) still apply.
- **Undecided:** whether the logo changes (see Brand Commitments); a custom domain.

## Brand Commitments

- **Name:** "TekaTech" stays (owner, 6 and 13 Nov 2026).
- **Logo:** **open decision.** The current mark is `frontend/src/assets/logo.webp` (a chip-style mark with the wordmark); the owner has not yet decided whether the rebrand keeps, redraws or replaces it.
- **Voice:** **plain English** for non-experts, clear and friendly; no Filipino or Taglish in UI text (owner, 13 Nov 2026). Matches the existing Plain-Language Answer option.
- Product honesty is part of the voice: the UI never presents an unverified answer as verified.

## Evidence on Hand

- Real catalog data: `docs/catalog-data/smartphones-2026-11-10.json` / `.md` (20 phones and fixes, each value from an official page with a Source URL; not yet entered into production, #201). Production has 4 gadgets today.
- Evaluation sources and cases: `prompts/eval/sources.json`, `prompts/eval/cases.json`, `prompts/eval/gk_cases.json`.
- Brand assets: `frontend/src/assets/logo.webp`, `frontend/src/assets/hero.png`, `frontend/public/favicon.svg`.
- User guide with the current copy: `docs/quick-start.md`.
- **Absent, never to be fabricated:** customer testimonials, user counts beyond the real figures, press, partnerships, retailer relationships, prices not on an official page, and user research.

## Product Principles

1. **Checkable over clever.** Every AI fact is traceable to a saved, sourced spec; when evidence is missing, say so plainly.
2. **Honest states.** Answer, no evidence, unverified general knowledge and failure always look different; failure is never shown as success.
3. **For the shopper, not the spec sheet.** Plain English and comparisons that help a purchase decision, without hiding the underlying numbers.
4. **Curated, then trusted.** Data enters through the team and reviewed corrections, so what users see is worth relying on.

## Accessibility & Inclusion

From the sprint plan's acceptance criteria (S2-MI, S3-MI, S4-MI): core paths work with the keyboard; visible labels and usable focus on forms; citations are keyboard-accessible; contrast and status messages are checked; no horizontal overflow or clipped controls at 360 px and 1280 px.
