# UI Presentation: Components, States and Accessibility

Frontend-only pass over the catalog, gadget detail, gadget/spec forms and the AI answer panel. No backend files changed.

## Reusable components (`src/components/ui/`)

| Component | What it does | Why it is built this way |
| --- | --- | --- |
| `Button` | One button style for the site (`primary`, `secondary`, `subtle`, `outline`, `danger`, `dangerSolid`, `ghost`; sizes `sm`/`md`/`lg`). Renders a `<button>` or, with `as={Link}`, a router link. `loading` shows a spinner, disables it and sets `aria-busy`. | Every action looks and behaves the same; minimum heights of 36–44 px keep touch targets usable at 360 px; every variant has a visible `focus-visible` ring. |
| `TextField`, `TextAreaField` | Visible label + control + hint + error. | Label is always shown and tied with `htmlFor`/`id`. Hint and error are linked with `aria-describedby`; invalid controls get `aria-invalid`. Errors use a red border **and** an icon **and** text, never color alone. Required fields show `*` (explained at the top of the form); optional ones say "(Optional)". |
| `ErrorSummary` | List of all invalid fields at the top of a form, each a link that focuses its field. | After a failed submit, focus moves here so keyboard and screen-reader users hear every problem at once (`role="alert"`). |
| `Alert` | Inline message in `error` / `success` / `warning` / `info` tone. | Errors use `role="alert"` (announced immediately); other tones use `role="status"` (polite). |
| `ErrorState` | Full-panel "couldn't load" screen with Try Again and an optional second action. | A failed load always offers a way forward instead of a blank page or a toast that disappears. |
| `ConfirmDialog` | Modal confirmation for destructive actions. | `role="alertdialog"` + `aria-modal`, labelled by its title and described by its body. Focus starts on **Cancel** (the safe choice), Tab is trapped inside, Escape/backdrop cancel (not while the request is running), focus returns to the button that opened it, page scroll is locked. Server errors show inside the dialog so the user can retry or back out. |
| `BackLink` | "← Back to …" link used at the top of sub-pages. | Same position, size and focus ring everywhere. |

Feature components built on them:

- `GadgetForm`: shared Add/Edit gadget form with client-side validation (`utils/gadgetValidation.js`). Validates on submit, then live per field. Server errors show in the form and keep what the user typed.
- `DeleteGadgetButton` / `DeleteSpecButton`: delete controls with confirmation (see below).
- `SpecManager`: Add Specs form (character counter, URL check), Suggest Correction form, and per-spec status.
- `AiAnswerResult`: shared loading / error / no-sources / answer states for both AI panels (single question and comparison).

## Delete with confirmation

Delete buttons are shown to **every user for now** (no admin check in the UI). Each one opens the same `ConfirmDialog`.

- **Gadgets:** `DeleteGadgetButton`, used as an icon button on each catalog card (accessible name such as "Delete Pixel 8"), Delete on the detail page, and a "Delete This Gadget" section on the edit page. The dialog states what is removed: the gadget plus its specs and pending corrections, which the database deletes in cascade. On success: a toast, the card disappears (catalog) or the user returns to the catalog (detail/edit), and the gadget leaves the compare tray.
- **Specs:** `DeleteSpecButton`, an icon button on each spec card ("Delete spec #0"). The dialog quotes the start of the spec text so the user can check they picked the right one. On success, the spec list reloads.
- **When the server refuses,** the dialog stays open with a plain-language reason (`utils/deleteErrors.js`):
  - Logged out (401): "Log in first, then try deleting this gadget again."
  - Not an admin (403): the backend's `DELETE /gadgets/{id}` still requires an admin account, and the message says so.
  - Spec delete (404/405): the backend has **no spec delete endpoint yet**, so the dialog says "The server doesn't support deleting specs yet, so nothing was removed." The button starts working once `DELETE /gadgets/{gadget_id}/specs/{spec_id}` exists (the client already calls that path).

## CRUD coverage

| Action | Gadget | Spec |
| --- | --- | --- |
| Create | Add Gadget page (navbar button) | Add Specs form on the detail page |
| Read | Catalog, detail page, compare page | Specifications list on the detail page |
| Update | Edit Gadget page | Suggest Correction → admin Review Queue (approve applies it) |
| Delete | Delete with confirmation (card, detail, edit); server allows admins only | Delete with confirmation on each spec card; needs a backend endpoint to succeed |

Note: the backend's `PATCH /gadgets/{id}` drops empty fields, so an optional value (price, date, image) can't be cleared from the edit form. The form says so under the field instead of failing silently.

## UI state checklist

| Screen | Loading | Empty | Success | Error |
| --- | --- | --- | --- | --- |
| Catalog | Skeleton matching the real layout (`role="status"`) | "Welcome" empty catalog; "No gadgets match your filters" with Clear Filters | Cards, filters, pagination, compare tray; delete toast | `ErrorState` with Try Again |
| Gadget detail | Layout-matched skeleton | "No Photo", "Not listed" for missing price/date | Details, Edit/Delete | "Gadget Not Found" (404) or "Couldn't Load" with Try Again |
| Specs list | Skeleton rows | "No Specs Yet" | Status badges (Ready for AI / Pending), saved toast | Inline `Alert` with Try Again |
| Add/Edit gadget form | Edit: form skeleton | – | Toast, then redirect to the gadget | Field errors + summary; server error `Alert`; edit load failure `ErrorState` |
| Add specs / correction | Spinner on submit button | – | Toast; list reloads | Field errors; server error `Alert` |
| AI answer panel | "Searching the spec sheets…" + skeleton (`aria-live`) | "No Matching Specs Found" | Answer with numbered citations, sources, Copy, Regenerate | "Couldn't Get an Answer" with Try Again |
| Delete dialogs (gadget, spec) | "Deleting…" spinner, controls locked | – | Toast; card removed, redirect, or spec list reloads | Plain-language reason inside the dialog (401/403/not supported) |
| Review queue | Skeleton | "Nothing to Review" | Approve/Reject toast | `ErrorState` with Try Again (previously showed "queue is clear" on failure) |
| Login | Spinner on submit | – | Toast, redirect | Inline `Alert` (replaces a disappearing toast) |

## Keyboard, focus and contrast review

- **Focus:** every control has a visible focus ring (component-level `focus-visible` rings plus a global fallback outline in `index.css`). Checkbox labels show the ring around the whole row.
- **Delete buttons** are icon-only on cards, so each has an accessible name and tooltip ("Delete Pixel 8", "Delete spec #0").
- **Keyboard paths checked:** `/` focuses the navbar search; Enter asks the AI. Tab order follows reading order. The delete dialog traps Tab, closes on Escape and returns focus (verified: focus goes to Cancel on open, wraps from the last button to Cancel, and returns to "Delete Pixel 8" on close). After a failed form submit, focus moves to the error summary, and its links focus the field.
- **Screen readers:** repeated buttons carry the gadget name ("Compare ROG Ally", "Ask AI about ROG Ally", "Details for ROG Ally"). External links say "(opens in a new tab)". Loading regions use `role="status"`; the AI answer is an `aria-live` region.
- **Contrast:** low-contrast greys (`gray-400`/`slate-400`, about 2.5:1 on white) were raised to `slate-500`/`slate-600` (4.7:1 or better) for text, placeholders and icon-only buttons. Amber warning text moved from `amber-600` (3.2:1) to `amber-700`/`amber-800`. Primary buttons are white on `#254b35` (about 9.5:1). The active nav pill is `#0f3723` on `#84ae92` (about 5.4:1).
- **Motion:** `prefers-reduced-motion` turns off animations and transitions.
- **Forms:** every field has a visible label (the comparison panel's question box previously had only a screen-reader label).

## Screenshots (`docs/screenshots/`)

All captured at exactly **360 px** and **1280 px** wide with headless Microsoft Edge (DevTools device metrics). Every capture reported `scrollWidth == viewport width` (no horizontal overflow).

- **Real data, logged out** (local dev server + backend): `catalog`, `gadget-detail`, `compare`, `login`, `not-found`, `gadget-not-found`.
- **States with mocked API responses and a mock admin session** (`state-*`): catalog loading / error / empty / admin view, delete confirm, delete error, detail as admin, specs load error, add-gadget validation errors, edit gadget (with delete section), AI answer success / no-sources / error.

The `state-*` screenshots use mocked network responses so that error, empty and admin states can be shown without changing or deleting real data. No real gadget was deleted while testing.
