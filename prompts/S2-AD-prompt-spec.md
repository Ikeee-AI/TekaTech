# S2-AD Prompt and Answer Specification

## 1. Ground Rules for Answer Generation
1. **Source Groundedness:** Answers must rely exclusively on verified spec data in the source pack or active database record.
2. **Citations:** Every factual claim must end with an inline source citation tag (e.g., ``).
3. **Comparison Rules:** When comparing two items, compare matching specs directly. If a spec is missing for one item, explicitly state that data is unavailable for that item.
4. **Insufficient Evidence Abstention:** If a user asks for information NOT present in the provided source pack or spec record, the system **MUST** output:
   > *"Insufficient verified evidence in the source pack to answer this question."*

---

## 2. Verified Source Pack (Smartphones)

### Gadget A: Apple iPhone 15
* **Label:** Apple iPhone 15
* **Source URL:** https://www.apple.com/iphone-15/specs/
* **Verified Facts:**
  1. Features a 6.1-inch Super Retina XDR OLED display with 2556 x 1179 resolution and up to 2000 nits peak outdoor brightness.
  2. Powered by the Apple A16 Bionic chip (6-core CPU, 5-core GPU).
  3. Equipped with a dual rear camera system: 48 MP main camera (f/1.6) with sensor-shift OIS and 12 MP ultra-wide (f/2.4).
  4. Contains a 3349 mAh rechargeable battery supporting USB-C (USB 2.0) and up to 15W MagSafe/Qi2 wireless charging.
  5. Holds an IP68 rating for water and dust resistance (maximum depth of 6 meters up to 30 minutes).

### Gadget B: Samsung Galaxy S24
* **Label:** Samsung Galaxy S24
* **Source URL:** https://www.samsung.com/global/galaxy-galaxy-s24/specs/
* **Verified Facts:**
  1. Features a 6.2-inch Dynamic LTPO AMOLED 2X display with FHD+ resolution (2340 x 1080), 1–120Hz adaptive refresh rate, and up to 2600 nits peak brightness.
  2. Powered by the Qualcomm Snapdragon 8 Gen 3 for Galaxy (or Exynos 2400) paired with 8GB RAM.
  3. Features a triple rear camera array: 50 MP main (f/1.8 OIS), 12 MP ultra-wide (f/2.2), and 10 MP telephoto with 3x optical zoom (f/2.4).
  4. Contains a 4000 mAh battery supporting 25W wired fast charging and 15W wireless charging.
  5. Built with Corning Gorilla Glass Victus 2, Armor Aluminum 2 frame, and IP68 water resistance (1.5 meters up to 30 minutes).

---

## 3. 10 Initial Evaluation Test Cases

| ID | Query | Expected Output / Behavior |
| :--- | :--- | :--- |
| **TC-01** | "What is the peak display brightness of the Apple iPhone 15?" | Up to 2000 nits peak outdoor brightness. |
| **TC-02** | "Does the Samsung Galaxy S24 have a telephoto lens with optical zoom?" | Yes, a 10 MP telephoto camera with 3x optical zoom. |
| **TC-03** | "What processor powers the Apple iPhone 15?" | Apple A16 Bionic chip. |
| **TC-04** | "What is the battery capacity and charging rate of the Samsung Galaxy S24?" | 4000 mAh battery supporting 25W wired fast charging. |
| **TC-05** | "What USB port version does the iPhone 15 use?" | USB-C supporting USB 2.0 speeds. |
| **TC-06** | "What is the water resistance rating for the Samsung Galaxy S24?" | IP68 rating (up to 1.5 meters for up to 30 minutes). |
| **TC-07** | "Compare the main camera megapixels and battery size between iPhone 15 and Galaxy S24." | iPhone 15: 48 MP main camera, 3349 mAh battery. Galaxy S24: 50 MP main camera, 4000 mAh battery. |
| **TC-08** | "Does the iPhone 15 support 120Hz ProMotion high refresh rate?" | Insufficient verified evidence in the source pack to answer this question. |
| **TC-09** | "What is the maximum microSD expandable storage capacity for the Galaxy S24?" | Insufficient verified evidence in the source pack to answer this question. |
| **TC-10** | "What are the color options available for the iPhone 15?" | Insufficient verified evidence in the source pack to answer this question. |