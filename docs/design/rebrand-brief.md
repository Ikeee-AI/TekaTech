# TekaTech rebrand brief: "Rail wayfinding" (draft for confirmation)

Impeccable `shape`, 13 Nov 2026, Ikeee-AI (AI-assisted, Claude Code). Degraded run: no concept-seed roll or decision page, because the owner keeps the Impeccable binary off. The derivation is recorded below, and the direction was chosen by the owner from four options (three directions plus the familiar category standard). Product truth is in `PRODUCT.md`; the problems this fixes are in `critique-2026-11-13.md` (26/40). Nothing here is built yet.

## 1. Job and audience

Filipino gadget shoppers, often on a mid-range Android phone, deciding between a few models (for example two phones under ₱25,000). Mode: **Operate**. They come to find, check and compare, so the site must read as a clear, standard tech catalog first. Members and admins use the same shell.

## 2. Outcome and proof

- A shopper sees gadgets in the first phone screen, picks two or three to compare, and asks questions.
- **Every AI fact visibly traces to an official source.**
- Proof is real: the saved specs, their source domains and checked dates, and the numbered citations. No invented ratings, prices or badges.

## 3. Selected direction: Rail wayfinding

**World:** Manila MRT/LRT wayfinding (station signs, line colours, numbered stops). It lends only the four things Impeccable allows on working screens: type, palette, density and one signature move. Navigation, buttons, inputs, tables and filters stay ordinary web controls.

- **Palette (Committed):** a deep navy shell (header and navigation bar) on a cool light ground. Strong line colours act as *functional* category colours (phones, laptops, audio, handheld and so on), used for category markers, filters and compare selections, never as decoration. Separate state colours: green ready, amber pending, red error; general knowledge gets its own neutral "unverified" treatment.
- **Type:** sign-style sans with very clear numerals (the Barlow family is the working candidate, to be confirmed in `typeset`), normal width for body text, and **tabular figures** for specs and ₱ prices. This retires the 75%-condensed Open Sans everywhere.
- **Density:** tighter catalog cards, larger key numbers.
- **Signature move: the evidence line.** In AI answers, citations are numbered station markers, and a line runs from the answer through each cited "stop" to its source card (domain and checked date). The same markers show on catalog cards as "3 sources", so how well-sourced a gadget is shows before you open it.
- **Cross-surface:** source counts on cards; spec tables with a source "stop" per row; the compare table with a line colour per gadget; the admin overview and Review Queue inherit the shell only.
- **Honest risk:** line colours could drift into decoration and noise. Rule: a colour always means a category, a compared gadget or a state.

**Derivation, for the record:** seven candidates from the shopper's world, across signage, official-print and retail families: rail wayfinding, the phone-box spec panel, NTC type-approval labels, peso banknote printing, mall price tags, jeepney signboards and sari-sari price boards. Alternates shown: Inspection label, Tech-store price tag, and the familiar tech catalog (standing exit).

## 4. Scope and boundaries

- **In scope (all five critique issues):** the identity (shell, palette, type, signature), the catalog cards (whole card links to Details; extras only Compare and Save; Delete moves to the gadget page; no duplicate brand; popular questions collapsed), typography, shopper copy (₱; admin-only indexing text; "From samsung.com · checked 23 Oct"), and the gadget page layout (compact header without a photo; key specs as a labelled table near the top).
- **Untouched:** `AnswerText.jsx`'s contract (`[n]` citations, `**bold**`, `- ` bullets) and the prompt. The citation *look* changes, the markers and behaviour don't. Also untouched: routes and URLs, API and data, auth flows, the five distinct AI states, admin-only access rules, the lint conventions.
- **Anti-goals:** a dark neon "gamer" look; transit costume (no fake ticket stubs, route maps as navigation, or turnstile graphics); colour without meaning; anything that hides the numbers shoppers compare.
- **Logo:** still an open owner decision. The direction works with today's mark; a redrawn mark can follow once the palette is set.

## 5. States and ranges

- Catalog: 4 gadgets (production today) up to about 30 (after #201); gadgets without a photo, price or date are common.
- Specs: 1 to 6 blocks per gadget.
- Answers: up to 6 sources, 0 to 6 citations.
- States to design: loading; empty catalog or filter result; No Evidence Found; No supporting source cited; general-knowledge (unverified) answer; timed out, unavailable and unusable responses; pending indexing (admin); compare with 2, 3 or 5 gadgets.

## 6. Interaction and layout

- Top navy bar with the standard navigation: Catalog, Compare, My Gadgets (members), plus Review Queue and Overview (admins); search stays in the bar. On phones: the bar plus a menu, search under it, and **the first gadget visible in the first screen**.
- Catalog: category filters as line-coloured chips; compact cards (name, key specs, ₱ price, source count, compare checkbox, save).
- Gadget page: compact header, a key-spec table with a source stop per row, the Ask panel, then the full specs.
- Answers: the evidence line connects citations to their source cards; clicking a citation still scrolls to and highlights the source.
- Keyboard and focus behaviour at least as good as today; targets 360 px and 1280 px; WCAG AA contrast for text, including on line colours.

## 7. Constraints and open decisions

- Stack: React 19 + Vite + Tailwind 4 tokens in `frontend/src/index.css`; fonts from Google Fonts (already used). Build path: **code-led** (Operate surfaces; no image generation in this setup).
- Ownership: frontend presentation is Mika's area, taken over by Ikeee-AI for the rebrand (owner decision, 6 Nov). Mika is asked to review each PR.
- **Open:** logo (keep, redraw or replace); the exact typefaces (`typeset` step); the line-colour assignment per category; whether the evidence line animates.
- **Delivery:** small reviewed PRs in this order: tokens and type → shell and catalog → gadget page and answers → copy → polish and re-critique. At the end, `DESIGN.md` is written from the built result.
