# Adding a gadget properly (admins)

Since 3 November 2026 the catalog is admin-curated: only admins add gadgets and specs, and everything users see, compare and ask the AI about comes from what is entered here. The AI only answers from **indexed** spec text. A gadget with one short paragraph gets "No Evidence Found" for most questions.

Target for Sprint 5: **6–10 gadgets**, each with full specs, before any pilot or demo.

## 1. Create the gadget (**+ Add Gadget**)

| Field | Do | Don't |
| --- | --- | --- |
| **Name** | The model as sold, e.g. `Galaxy S24` or `Samsung Galaxy S24` (the brand isn't repeated in questions either way) | Add colours or storage (`S24 256GB Black`) unless they are separate models |
| **Brand** | `Samsung`, `Apple`, `Xiaomi`: the same spelling every time | Mix `Poco` and `POCO` (the filter lists them separately) |
| **Category** | Reuse an existing one: `Smartphone`, `Laptop`, `Tablet`, `Console`, `Smartwatch`… | Invent near-duplicates (`Phone`, `Mobile phone`) |
| **Price (Php)** | The Philippine launch or current official price | Leave it blank if one is known (Compare shows "—") |
| **Release date** | The official launch date | Guess |
| **Image link** | A **direct image link**: opening it shows only the picture, usually ending in `.jpg`, `.png` or `.webp` | Paste a web page or a search-result link. Check: open the link in a new tab, and if you see a whole page it won't display |

## 2. Add the specs (**Add Specs** on the gadget's page)

- **Source:** the manufacturer's official spec page, or another source you're allowed to copy. Put that page's address in **Source URL**: it becomes the citation users click. **Don't copy from TechSpecs** (techspecs.io). Its terms forbid storing its data without permission, and permission has been requested but not given.
- **Write one fact per line as `Label: value` with units**, and separate topics with a blank line:

  ```text
  Chip: Snapdragon 8 Gen 3
  RAM: 8 GB
  Storage: 128 / 256 / 512 GB

  Display: 6.2" Dynamic AMOLED 2X, 2340 x 1080, 120 Hz
  Battery: 4000 mAh
  Charging: 25 W wired, 15 W wireless

  Main camera: 50 MP + 12 MP ultra-wide + 10 MP 3x telephoto
  Front camera: 12 MP
  ```
- **Cover what people ask** (see Trending Questions on the catalog). That means chip, RAM/storage, display (size, type, resolution, refresh rate), battery (mAh) and charging, cameras, weight and size, operating system, water resistance (IP rating), connectivity (5G, Wi-Fi, NFC) and launch price. Write units next to numbers (`4000 mAh`, `209 g`): keyword search relies on them.
- **Keep it factual.** Spec text goes straight into the AI's context. Never paste instructions, opinions or text addressed to the AI.
- Limits: up to 20,000 characters (6,000 tokens) per paste. A full spec sheet fits in one paste and is split into cards of about 300 tokens automatically.

## 3. Make it usable by the AI

- New specs show **Pending AI Indexing**. Click **Index All Pending** above the spec cards (admins only), or **Index for AI** on each card.
- Indexing is limited to **20 per hour**. A long spec sheet makes several cards, so a big batch may stop at the limit; continue after the hour. If indexing fails, the text stays saved; retry later.
- Check: the green line "All N specs are ready for AI answers".

## 4. Check it like a user

- On the gadget's page, ask two or three typical questions (`What chip does it use?`, `How big is the battery?`). Each answer should have numbered citations that jump to your spec cards. Each question costs a little OpenAI credit, so don't overdo it.
- "No Evidence Found" for a basic question means that fact is missing from the specs. Add it.
- Mistakes later: users can **Suggest Correction**. Approving one in the **Review Queue** replaces the text and re-indexes it.
