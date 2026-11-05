# TekaTech quick-start guide

TekaTech helps you understand and compare gadget specifications. Every AI answer is built only from specs saved in TekaTech, and each fact links to its source, so you can check it yourself.

**Open it:** https://tekatech-web.onrender.com
The free server sleeps when nobody uses it, so the **first** request after a quiet period can take about a minute. After that it's fast.

---

## Without an account

### Browse the catalog
- The home page lists every gadget. Use **Filters** (category, brand, max price) on the left and **Sort By** above the list.
- Type a name or brand in the search bar at the top to filter the list.
- Click **Details** on a card to see its price, release date and saved specifications.

### Ask the AI about one gadget
1. Open a gadget's page.
2. In **Ask About …**, click a suggested question or type your own (up to 150 characters) in the message box at the bottom and press **Enter** (or the round ↑ **Send** button).
3. Read the answer. Each number like **[1]** is a source: click it to jump to the spec snippet it came from.
   - **Answer based on N cited specs** tells you how many saved specs back the answer.
   - **No supporting source cited** means nothing in the answer is backed by a saved spec, so treat it as unverified.
   - **No Evidence Found** means TekaTech has no specs that answer the question. It doesn't guess.
   - **N Sources Retrieved** (under the answer) lists every snippet the AI was given; the cited count above is what the answer actually uses.
4. Optional: tick **Plain-Language Answer** for simpler wording. Use **Copy** to copy the answer, or a **follow-up question** to keep going.

You can also type a question in the top search bar and press **Enter** to ask across the whole catalog.

### Compare gadgets
1. In the catalog, tick **Compare** on 2 or 3 gadgets. They collect in the **Compare** tray at the bottom.
2. Click **Compare Now (N)** in the tray to open the side-by-side table.
3. Under **AI Trade-Off Comparison**, ask a question (for example "Which one has the better battery?") and press **Generate Comparison**.
4. Click **Share** to create a short link (`…/c/…`). It's copied to your clipboard, and anyone can open it without an account.

### If something goes wrong
The AI panel always tells you what happened and keeps the question you typed:
- **The AI Timed Out** or **AI Answers Are Unavailable:** press **Try Again**, or come back in a few minutes. Browsing still works.
- **Unusable AI Response:** rephrase the question and try again.

---

## With an account

### Sign up, log in, reset your password
- Click **Log In** (top right) → **Don't have an account? Sign Up**. Enter your email and a password (at least 6 characters), then open the confirmation link sent to your email before logging in. When the link works, TekaTech shows **Email Confirmed** and you're signed in.
- **The link says "This Email Link Has Expired or Was Already Used"?** Email links work once and expire after a while. If you already confirmed, just **Log In**. Otherwise click **Send a New Link**, enter your email and **Send Confirmation Email**, then use the link in the **newest** email.
- **Logging in says "This email isn't confirmed yet"?** Click **Resend Confirmation Email** under the message, then open the new link.
- Forgot your password? On the log-in page, click **Forgot password?** and follow the emailed link.

### Your account
- Click the round **avatar** at the top right (**Account** in the phone menu) to open **Your Account**: your email, the date you joined, your role (Member or Admin) and links to **My Gadgets** and **My Suggestions**.
- **Change Password:** enter your **current password**, then the new one twice (at least 6 characters, and different from the current one) → **Update Password**. TekaTech checks your current password first, so nobody can change it from a computer you left signed in. **Password Updated** means it's done; you stay signed in. If it says **Your current password is incorrect.**, nothing was changed.
- Deleting your account isn't available yet (planned after the pilot, #213).

### Add or edit a gadget (admins only)
The catalog is curated by the TekaTech team: only admin accounts see **Add Gadget**, **Edit**, **Add Specs** and **Index for AI**. A regular account contributes through **Suggest a correction** below.
- **Add Gadget** (top bar): name, brand and category are required; price, release date and image link are optional. Then **Save Gadget**.
- **Image URL:** use a *direct* image link: opening it in a new tab shows only the picture. As soon as you paste a link, the form previews it the way the catalog card will. **Image found** means it's fine. **Couldn't load an image from this link** usually means it's a web page, not a picture, and the form won't save until you fix the link or leave the field empty.
- On a gadget's page, **Edit** lets you change any field (**Save Changes**). Emptying an optional field, such as price, clears it.

### Add specs, then index them for the AI (admins only)
1. On a gadget's page, click **Add Specs**.
2. Paste the spec text. Separate facts with blank lines; short blocks are grouped into snippets of about 300 tokens, so a short spec sheet may become a single card. Add the **Source URL** you copied it from, then **Save Specs**.
3. New specs show **Pending AI Indexing**. They're saved and readable straight away, but the AI can't use them yet.
4. Specs saved from one source link appear together in one card; the **parts** button in its header opens or closes it (the first card starts open). Click **Index for AI** on a part, or **Index All Pending** once for the whole gadget. When a card's header says **Ready for AI**, answers can cite it. If indexing fails, your text is still saved; try again later.

### My Gadgets (your dashboard)
- After you log in you land on **My Gadgets**. It's empty at first.
- In the **Catalog**, click **Add to My Gadgets** on any gadget card. Click it again (**In My Gadgets**) to take it off.
- On **My Gadgets**: **Ask AI** opens the gadget's page with its question box, and **Remove** takes it off your list (the catalog is unchanged). Tick 2–5 gadgets and click **Compare & Ask AI** to compare them side by side and ask about all of them at once.
- A gadget's page has a chat box: type in the message box at the bottom and press **Enter** to send (**Shift+Enter** for a new line). Long conversations scroll inside the box; the **↓** button jumps back to the newest message. When you're logged in, your questions and answers are kept, so coming back later (on any device) reopens the conversation with citations working. **New Chat** deletes it for that gadget. Logged out, the chat lasts until you leave the page, and comparison questions are never kept.

### Suggest a correction
1. On any spec, click the **flag** button (**Suggest Correction**), write the corrected text, and **Submit for Review**.
2. Click the **inbox icon** (📥, top bar; **My Suggestions** on phones) to follow it: **Pending**, then **Approved** or **Rejected**. A **New decision** badge appears when an admin has decided.

---

## For admins

Admin rights are set by the team (`app_metadata.is_admin`). You can't give them to yourself.

- **Adding gadgets and specs:** follow the [admin catalog guide](admin-catalog-guide.md) (fields, spec format, sources, indexing). After adding specs, **Index All Pending** (above the spec cards) indexes every pending card in turn. It stops at the 20-per-hour indexing limit and tells you how many are left.

- **Review Queue** (top bar; the red number is how many are waiting): each suggestion shows the current text and the suggested text, with removed words struck through and added words underlined. **Approve** replaces the spec text and re-indexes it for the AI automatically; **Reject** keeps the current text.
- **Delete Gadget** (on the gadget's page or its edit page) and **Delete Spec** (the bin icon on a spec card) are admin-only and ask you to confirm first.

---

*Questions or bugs: open an issue at https://github.com/Ikeee-AI/TekaTech/issues. Developers: see "Run locally" in the [README](../README.md).*
