# Smartphone catalog data pack, 10 Nov 2026 (S5-MA)

Run by Manuel (`s2302827-byte`, AI-assisted: yes, Claude Code). Task from Ikeee-AI: team-made catalog data, not user input, with legitimate sources (continues #201). Machine-readable copy: [`smartphones-2026-11-10.json`](smartphones-2026-11-10.json).

**Rules this pack follows**
- Every value was read from the official page in its **Source URL** on 10 Nov 2026. Nothing came from memory or from search-result summaries.
- If a source does not state a value, it is **left out and listed under Gaps**. No guessed prices, dates or chips.
- Not copied from TechSpecs (its terms forbid it, `docs/admin-catalog-guide.md`).
- This PR **does not change any database**. Only an admin can add data to production: enter each block with **Add Specs**, using that block's Source URL, then **Index All Pending**.
- The pages were first read with a fetch tool. Afterwards I **re-checked 66 key values directly in each page's own HTML** (processor, battery, charging, weight, IP rating, price, model codes and similar, across all 11 pages that loaded). All 66 were present. The other lines were not re-checked, so skim a few against the live page before entering.
- Pages that did not load: Xiaomi PH and global (HTTP 403) and Infinix PH (the spec text is built in the browser, so only a title came back).

| # | Gadget | Action | Specs blocks | Price (Php) | Image |
| --- | --- | --- | --- | --- | --- |
| 1 | Samsung Galaxy S24 | add | 2 | 50990 | none found |
| 2 | OPPO Reno13 5G | add | 1 | not verified | yes |
| 3 | vivo V50 5G | add | 2 | 22999 | yes |
| 4 | realme 14 Pro+ 5G | add | 1 | not verified | none found |
| 5 | OPPO Reno13 F 5G | add | 1 | not verified | yes |
| 6 | Samsung Galaxy A56 5G | add | 1 | not verified | none found |
| 7 | Apple iPhone 15 | fix | 1 | not verified | yes |
| 8 | Infinix Infinix Note 50 Pro 5G+ (rename to NOTE 50 Pro+ 5G) | blocked | 0 | not verified | none found |
| 9 | POCO POCO X7 Pro (production says 'Poco x7 Pro') | fix | 1 | not verified | yes |
| 10 | ASUS ROG Ally (2023) | fix | 1 | not verified | none found |

`add` = new gadget. `fix` = already in production; replace its data. `blocked` = could not be sourced.


---

## Samsung Galaxy S24 (add)

- **Name / Brand / Category:** Galaxy S24 / Samsung / Smartphone
- **Price (Php):** 50990. Samsung PH spec page: 256GB ₱50,990.00; 512GB ₱58,990.00. The 256GB price is used.
- **Release date:** leave blank. Not stated by either Samsung page.
- **Image link:** none verified. No product image URL on the Samsung pages (only footer badges).

**Specs block. Source URL:** https://www.samsung.com/ph/smartphones/galaxy-s24/specs/ (accessed 2026-11-10; page text as returned by the fetch tool (full page))

```text
Processor: Exynos 2400
Storage variants listed in the price list: 256GB and 512GB

Display: 6.2" Dynamic AMOLED 2X (full rectangle; 6" with rounded corners)
Resolution: 2340 x 1080 (FHD+)
Refresh rate: 120 Hz
Peak brightness: up to 2600 nits
Contrast ratio: 5,000,000:1

Battery: 4000mAh
Music playback: 78 hours
Video playback: 29 hours

Rear cameras: 50MP f/1.8 (main), 10MP f/2.4 (telephoto), 12MP f/2.2 (ultra-wide)
Front camera: 12MP f/2.2

Dimensions: 147.0 x 70.6 x 7.6 mm
Weight: 167 g
Water resistance: IP68
Frame: Armor Aluminum
Glass: Corning Gorilla Glass Victus 2
```

**Specs block. Source URL:** https://www.samsung.com/ph/support/mobile-devices/differences-between-the-galaxy-s24-models/ (accessed 2026-11-10; table cells of the page, first column (Galaxy S24 only))

```text
RAM: 8 GB
Internal storage: 128 / 256 / 512 GB
Wireless charging: Supported
Ultrasonic fingerprint scanner: Yes
Zoom: Optical Zoom 3x, Optical Quality Zoom 2x, Digital Zoom up to 30x
```

**Gaps**
- Charging wattage, operating system version, Wi-Fi/Bluetooth/NFC and SIM are not on either page.
- The two Samsung pages differ on storage (spec page price list: 256GB and 512GB; comparison page: 128/256/512GB). Both are quoted as stated.

---

## OPPO Reno13 5G (add)

- **Name / Brand / Category:** Reno13 5G / OPPO / Smartphone
- **Price (Php):** leave blank. Not on the OPPO page (it links to retailers).
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://www.oppo.com/content/dam/oppo/common/mkt/v2-2/reno13-series/specs/reno13-5g/blue-white.png. Checked 10 Nov: HTTP 200, image/png, three phones, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://www.oppo.com/ph/smartphones/series-reno/reno13/specs/ (accessed 2026-11-10; page text as returned by the fetch tool (full page))

```text
Model: OPPO Reno13 5G (CPH2689)

SoC: MediaTek Dimensity 8350
CPU: 8 cores
GPU: ARM G615 (printed on the page as "ARM Turse G615")
RAM and storage: 12GB + 512GB (the only configuration listed)
RAM type: LPDDR5X@3750MHz 4 x 16bits
Storage type: UFS 3.1

Display: 6.59" AMOLED (flexible)
Resolution: FHD+ 1256 x 2760 pixels
Refresh rate: maximum 120Hz (60/90/120Hz)
Touch sampling rate: maximum 240Hz
Brightness: 600 nits (typical); 1200 nits (typical, HBM)
Pixel density: 460 PPI
Cover glass: Corning Gorilla Glass 7i

Battery: 5450mAh/21.37Wh (rated); 5600mAh/21.96Wh (typical)
Fast charging protocols: SUPERVOOC 2.0, SUPERVOOC, VOOC 3.0, PD2.0 (9V/1.5A)

Rear cameras: 50MP wide f/1.8 with AF and OIS; 8MP ultra-wide f/2.2 with AF; 2MP monochrome f/2.4
Front camera: 50MP f/2.0 with AF

Dimensions: about 157.90 mm x 74.73 mm x 7.24 mm (Plume White) or 7.29 mm (Luminous Blue)
Weight: about 181 g
Operating system: ColorOS 15.0

Wi-Fi: Wi-Fi 6 (802.11ax), Wi-Fi 5 (802.11ac), 802.11b/g/a/n; 2 x 2 MIMO
Bluetooth: 5.4, Low Energy
NFC: Supported
USB: Type-C
SIM: Nano-SIM, dual SIM
```

**Gaps**
- No IP rating and no charging wattage are listed on the page.
- Price and release date are not on the page.

---

## vivo V50 5G (add)

- **Name / Brand / Category:** V50 5G / vivo / Smartphone
- **Price (Php):** 22999. vivo PH shop page: ₱22,999.00 (incl. all taxes) for the V50 5G Satin Black 8GB+256GB only. No other variant has a price on the page.
- **Release date:** leave blank. Not stated by either vivo page.
- **Image link:** https://asia-exstatic-vivofs.vivo.com/PSee2l50xoirPK7y/1740474582649/6fde365016f2708bce15cfbbc9590f07.png. Checked 10 Nov: HTTP 200, image/png, 640 x 640 phone render (listed on the page as the Satin Black colour image).

**Specs block. Source URL:** https://www.vivo.com/ph/products/param/v50 (accessed 2026-11-10; page text as returned by the fetch tool (full page))

```text
Processor: Snapdragon 7 Gen3
CPU core count: 8
Process node: 4 nm
CPU clock speed: 1 x 2.63 GHz + 3 x 2.4 GHz + 4 x 1.8 GHz

RAM type: LPDDR4X
RAM + ROM: 12 GB + 256 GB / 12 GB + 512 GB
Expandable RAM capacity: 8 GB / 12 GB
Expandable ROM capacity: Not supported

Display size: 6.77"
Resolution: 2392 x 1080
Display type: AMOLED
Refresh rate: 60/90/120 Hz
Pixel density: 387 PPI
Local peak brightness: 4500 nits
Global maximum brightness: 1300 nits
Color gamut: P3 wide color gamut supported

Battery: 6000 mAh (TYP)
Charging power: 90W
Battery type: Li-ion

Rear camera: 50 MP main camera: OIS; f/1.88; FOV 84 degrees
Rear camera: 50 MP wide-angle lens: AF; f/2.0; FOV 119.4 degrees
Front camera: 50 MP super wide-angle lens: AF; f/2.0; FOV 92 degrees
Video recording: 4K/1080P/720P

Dimensions: 163.29 x 76.72 x 7.39 mm (Black); 163.29 x 76.72 x 7.57 mm (Purple, Red)
Weight: 189 g (Black); 199 g (Purple, Red)
Back cover: plastic composite sheet (Black); glass (Purple, Red)
Fingerprint sensor: in-display optical
Operating system: Funtouch OS 15 (Android 15)
Ingress protection: IP68; IP69

Wi-Fi: 2.4 GHz / 5 GHz
Bluetooth: 5.4
USB: USB 2.0
NFC: reader/writer mode and card emulation mode supported
SIM: 2 nano SIMs, 5G + 5G dual SIM dual standby
```

**Specs block. Source URL:** https://shop.vivo.com/ph/product/2130 (accessed 2026-11-10; page text as returned by the fetch tool (full page))

```text
Variants offered (vivo PH shop): 8GB+256GB (5G), 12GB+256GB (5G), 12GB+512GB (5G)
Colours: Satin Black, Mist Purple, Ancora Red
```

**Gaps**
- vivo's spec page lists 12GB RAM variants only, while the shop page also lists 8GB+256GB. Both are quoted as stated.
- Release date is not on either page.

---

## realme 14 Pro+ 5G (add)

- **Name / Brand / Category:** 14 Pro+ 5G / realme / Smartphone
- **Price (Php):** leave blank. Not on the spec page (the only price on it belongs to a different phone).
- **Release date:** leave blank. Not stated by the page.
- **Image link:** none verified. The only image URLs on the page are plain colour circles, not product photos.

**Specs block. Source URL:** https://www.realme.com/ph/realme-14-pro-plus-5g/specs (accessed 2026-11-10; page text as returned by the fetch tool; long values paraphrased by the tool, numbers kept)

```text
Processor: Qualcomm Snapdragon 7s Gen 3 (5G; 4nm)
CPU: octa-core; 1x Kryo Prime Cortex-A720 up to 2.5GHz; 3x Kryo Gold Cortex-A720 up to 2.4GHz; 4x Kryo Silver Cortex-A520 up to 1.8GHz
GPU: Adreno 810

Configuration: 12GB+512GB (the only one listed)
RAM: 12GB (up to 14GB dynamic RAM expansion)
Storage: 512GB

Display: 6.83" 42 degree Quad Curved OLED
Resolution: 2800x1272 (1.5K)
Refresh rate: 120Hz
Peak brightness: 1,200 nits
PWM dimming: 3840Hz
Touch sampling rate: up to 240Hz
Contrast ratio: 5,000,000:1
Color gamut: 100% DCI-P3
Display protection: Corning Gorilla Glass 7i

Battery: 6000mAh (typ.); 5860mAh (rated)
Charging: 80W SUPERVOOC charging adapter included in the box
Charging port: USB Type-C

Main rear camera: 50MP Sony IMX896, OIS, f/1.8
Telephoto rear camera: 50MP Sony IMX882, 3x periscope, OIS, f/2.65
Wide-angle rear camera: 8MP Sony IMX355, 112 degrees, f/2.2
Front camera: 32MP, f/2.0
Rear video: 4K at 30fps
Front video: 4K at 30fps

Dimensions: length 163.51 mm, width 77.34 mm, depth approx. 7.99 mm (Pearl White) or 8.29 mm (Suede Grey)
Weight: approx. 194 g (Pearl White); 196 g (Suede Grey)
Operating system: realme UI 6.0, Android 15
Water and dust resistance: IP69, IP68, IP66 rated

Network: 5G supported, dual standby
Wi-Fi: Wi-Fi 6 (802.11ax)
Bluetooth: 5.2
USB: Type-C with OTG
SIM: 2 nano SIM slots
```

**Gaps**
- Price and release date are not on the page.

---

## OPPO Reno13 F 5G (add)

- **Name / Brand / Category:** Reno13 F 5G / OPPO / Smartphone
- **Price (Php):** leave blank. Not on the page (it links to retailers).
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://www.oppo.com/content/dam/oppo/common/mkt/v2-2/reno13-series/specs/reno13-f-5g/grey-darkblue-purple-v1.png. Checked 10 Nov: HTTP 200, image/png, three phones, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://www.oppo.com/ph/smartphones/series-reno/reno13-f-5g/specs/ (accessed 2026-11-10; page text as returned by the fetch tool (full page))

```text
Model: OPPO Reno13 F 5G (CPH2699)

SoC: Qualcomm Snapdragon 6 Gen 1 Mobile Platform
CPU: 8 cores
GPU: Adreno 710@676MHz
RAM and storage: 12GB + 256GB and 12GB + 512GB
RAM type: LPDDR4X@2133MHz 2 x 16 bits
Storage type: UFS 3.1
Storage card: Supported

Display: 6.67" rigid AMOLED
Resolution: 1080 x 2400 pixels
Refresh rate: maximum 120Hz (60/120Hz)
Touch sampling rate: maximum 180Hz
Brightness: 600 nits (typical); 1200 nits (typical, HBM)
Pixel density: 394 PPI

Battery: 5800mAh/22.74Wh (typical); 5640mAh/22.11Wh (rated)
Fast charging: 45W (max)
Charging protocols: SUPERVOOC 2.0, SUPERVOOC, VOOC 3.0, PD, QC, PPS

Rear cameras: 50MP wide f/1.8 with AF and OIS; 8MP ultra-wide f/2.2 with EIS; 2MP macro f/2.4
Front camera: 32MP f/2.4

Dimensions: about 162.20 mm x 75.05 mm x 7.76 mm (Graphite Grey and Plume Purple) or 7.82 mm (Luminous Blue)
Weight: about 192 g
Operating system: ColorOS 15.0

Wi-Fi: Wi-Fi 5 (802.11ac), 802.11b/g/a/n
Bluetooth: 5.1, Low Energy
NFC: Supported
USB: Type-C
SIM: Nano-SIM
```

**Gaps**
- No IP rating is listed on the page.
- Price and release date are not on the page.

---

## Samsung Galaxy A56 5G (add)

- **Name / Brand / Category:** Galaxy A56 5G / Samsung / Smartphone
- **Price (Php):** leave blank. The page shows 'Not for sale' and unrendered price placeholders.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** none verified. No image URL on the page text (alt text only).

**Specs block. Source URL:** https://www.samsung.com/ph/smartphones/galaxy-a/galaxy-a56-5g-awesome-graphite-256gb-sm-a566bzktphl/ (accessed 2026-11-10; specification section of the page, verbatim part of the fetch)

```text
Model: Galaxy A56 5G (SM-A566BZKTPHL)

CPU type: Octa-Core
CPU speed: 2.9 GHz, 2.6 GHz, 1.9 GHz
Memory: 8 GB
Storage: 256 GB (234.4 GB available)

Display size: 6.7" full rectangle (6.5" with rounded corners)
Display technology: Super AMOLED
Resolution: 1080 x 2340 (FHD+)
Maximum refresh rate: 120 Hz
Brightness: 1,200-nit Vision Booster

Battery capacity (typical): 5000 mAh
Video playback time: up to 29 hours
Battery: not removable

Rear cameras: 50.0 MP + 12.0 MP + 5.0 MP (F1.8, F2.2, F2.4), auto focus, OIS
Front camera: 12.0 MP, F2.2
Zoom: digital zoom up to 10x
Video recording: UHD 4K (3840 x 2160) at 30fps
Slow motion: 240fps at HD

Dimensions: 162.2 x 77.5 x 7.4 mm
Weight: 198 g
Operating system: Android, One UI 7
Software support: up to 6 generations of OS upgrades; security updates until 31 March 2032
Water resistance: IP67

Wi-Fi: 802.11a/b/g/n/ac/ax 2.4GHz+5GHz
Bluetooth: v5.3
USB: Type-C, USB 2.0
5G: Sub6 FDD and TDD
SIM: dual SIM; Nano-SIM and embedded SIM
```

**Gaps**
- Samsung's PH page names no chipset, only the CPU clock speeds, so the chip name is deliberately left out.
- Charging wattage and NFC are not in the spec table. Price and release date are not on the page.

---

## Apple iPhone 15 (fix)

- **Name / Brand / Category:** iPhone 15 / Apple / Smartphone
- **Price (Php):** leave blank. Not on Apple's tech-specs page. Production has no price today; an admin should take it from Apple PH's store page.
- **Release date:** leave blank. Apple's page gives only 'Year introduced: 2023', so no full date is entered.
- **Image link:** https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/iphone_15_hero.png. Checked 10 Nov: HTTP 200, image/png, 1000 x 1000, five colours, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://support.apple.com/en-ph/111831 (accessed 2026-11-10; page text as returned by the fetch tool (full page))

```text
Year introduced: 2023

Chip: A16 Bionic chip
CPU: 6-core CPU with 2 performance and 4 efficiency cores
GPU: 5-core GPU
Neural Engine: 16-core Neural Engine
Storage: 128GB, 256GB, 512GB

Display: Super Retina XDR, 6.1-inch (diagonal) all-screen OLED
Resolution: 2556-by-1179-pixel resolution at 460 ppi
Brightness: 1000 nits max (typical); 1600 nits peak (HDR); 2000 nits peak (outdoor)
Contrast ratio: 2,000,000:1 (typical)

Video playback: up to 20 hours
Video playback (streamed): up to 16 hours
Audio playback: up to 80 hours
Battery: built-in rechargeable lithium-ion battery
Wireless charging: MagSafe up to 15W; Qi2 up to 15W; Qi up to 7.5W (chargers sold separately)
Fast charge: up to 50% in around 30 minutes with a 20W adapter or higher (sold separately)
Connector: USB-C (charging, DisplayPort, USB 2 up to 480Mb/s)

Rear camera: 48MP Main, 26 mm, f/1.6, sensor-shift optical image stabilization
Rear camera: 12MP Ultra Wide, 13 mm, f/2.4, 120 degree field of view
Rear camera: 12MP 2x Telephoto, 52 mm, f/1.6
Digital zoom: up to 10x
Front camera: TrueDepth, 12MP, f/1.9
Video: 4K Dolby Vision recording at 24, 25, 30 or 60 fps

Width: 71.6 mm
Height: 147.6 mm
Depth: 7.80 mm
Weight: 171 grams
Water resistance: IP68 (maximum depth of 6 meters up to 30 minutes) under IEC standard 60529

Cellular: 5G NR; Gigabit LTE with 4x4 MIMO and LAA
Wi-Fi: Wi-Fi 6 (802.11ax) with 2x2 MIMO
Bluetooth: 5.3
Ultra Wideband: second-generation chip
NFC: with reader mode
SIM: dual eSIM; iPhone 15 and iPhone 15 Plus use eSIM technology and are not compatible with physical SIM cards
```

**Gaps**
- The page does not give an iOS version in the spec list.
- Price is not on the page.

---

## Infinix Infinix Note 50 Pro 5G+ (rename to NOTE 50 Pro+ 5G) (blocked)

- **Name / Brand / Category:** Infinix Note 50 Pro 5G+ (rename to NOTE 50 Pro+ 5G) / Infinix / Smartphone
- **Price (Php):** leave blank. Production has 20000. No official page I could read confirms it.
- **Release date:** leave blank. Not found.
- **Image link:** none verified. Not found. Ikeee-AI's 3 Nov check: the current host (shoppingmall.homecredit.ph) blocks other sites from showing it.

**Gaps**
- Infinix's PH spec pages (ph.infinixmobility.com) are built in the browser, so reading them returned only a title and navigation, with no specs. Their global page redirects to the PH site and returns 404.
- The official name on the PH page title is 'NOTE 50 Pro+ 5G'. Production calls it 'Infinix Note 50 Pro 5G+' and its Source URL is on ph-ec-test.infinixmobility.com, a test host. Needs an admin or teammate to read the live PH spec page in a browser and copy it.
- Not entered from memory or from a search summary.

---

## POCO POCO X7 Pro (production says 'Poco x7 Pro') (fix)

- **Name / Brand / Category:** POCO X7 Pro (production says 'Poco x7 Pro') / POCO / Smartphone
- **Price (Php):** leave blank. Not on the page. Production has 14999; nothing I could read confirms it.
- **Release date:** leave blank. Not stated. Production has 2026-10-12 (the card shows 'Rel. Oct 2026'); the page gives no such date and Ikeee-AI's log already marks it as wrong. Clear it unless a dated official source is found.
- **Image link:** https://i02.appmifile.com/mi-com-product/fly-birds/poco-x7-pro/pc/1a097d170ec6940798552eee961fc641.png. Checked 10 Nov: HTTP 200, a wide 2560 x 1603 promotional photo of the phones' backs, served as application/octet-stream (no nosniff header was sent, so browsers should still show it; check on the card).

**Specs block. Source URL:** https://www.po.co/global/product/poco-x7-pro/ (accessed 2026-11-10; page text as returned by the fetch tool (global POCO page; the PH Xiaomi page returned 403))

```text
Chip: Dimensity 8400-Ultra (4nm process; Arm Cortex-A725 all-big-core CPU design)
Memory and storage: LPDDR5X and UFS 4.0; up to 12GB + 512GB (the 12GB + 512GB variant may vary by region)

Display: 6.67-inch 1.5K CrystalRes flagship AMOLED
Resolution: 2712 x 1220
Refresh rate: 120Hz
Peak brightness: 3200 nits
Contrast ratio: 5,000,000:1

Battery: 6000mAh (typical)
Charging: 90W HyperCharge; charges to 100% in 42 minutes

Main camera: 50MP with OIS (Sony IMX882, f/1.5)
Ultra-wide camera: 8MP
Front camera: 20MP

Operating system: Xiaomi HyperOS 2
Water and dust resistance: IP68, water resistance up to 1.5m (static freshwater, up to 30 minutes, lab conditions)
Wi-Fi: Wi-Fi 6
Bluetooth: 6.0
NFC: multifunctional NFC
Other: IR blaster; in-screen fingerprint sensor; dual-frequency GPS and triple-frequency BDS
```

**Gaps**
- The source is POCO's global page, not the Philippines page (Xiaomi PH blocked the fetch with HTTP 403). It is official, but it may differ by region.
- Dimensions, weight, SIM, price and release date are not on the page.

---

## ASUS ROG Ally (2023) (fix)

- **Name / Brand / Category:** ROG Ally (2023) / ASUS / Console
- **Price (Php):** leave blank. The ASUS PH page says 'estore price starting at' with no amount. Production has 45000; nothing I could read confirms it.
- **Release date:** leave blank. Not on the page.
- **Image link:** none verified. Only a 250px extension-less thumbnail (dlcdnwebimgs.asus.com/.../w250/fwebp) was found; too small, so not used.

**Specs block. Source URL:** https://rog.asus.com/ph/gaming-handhelds/rog-ally/rog-ally-2023/spec/ (accessed 2026-11-10; first read through a model-extracted summary of the page; then 14 key values (processors, cache, TFLOPs, memory, battery, weight, Wi-Fi/Bluetooth, ports) were re-checked in the page's own HTML. The remaining lines were not re-checked.)

```text
Model: ROG Ally (2023), two SKUs on the page: RC71L-NH019W and RC71L-NH001W. The page does not say which processor goes with which SKU.

Processor option 1: AMD Ryzen Z1 Processor (Zen4, 4nm, 6-core/12-thread, 22MB total cache, up to 4.90 GHz boost)
Processor option 2: AMD Ryzen Z1 Extreme Processor (Zen4, 4nm, 8-core/16-thread, 24MB total cache, up to 5.10 GHz boost)
TDP: 9-30W
Graphics with Z1: AMD Radeon Graphics (RDNA 3, 4 CUs, up to 2.5 GHz, up to 2.8 Teraflops)
Graphics with Z1 Extreme: AMD Radeon Graphics (RDNA 3, 12 CUs, up to 2.7 GHz, up to 8.6 Teraflops)

Memory: 16GB LPDDR5 on board (6400MT/s dual channel)
Storage: 512GB PCIe 4.0 NVMe M.2 SSD (2230)

Display: 7-inch, FHD (1920 x 1080) 16:9, IPS-level
Refresh rate: 120Hz
Response time: 7ms
Brightness: 500 nits
Coating: anti-glare and low-reflection
Color: 100% sRGB, 75.35% Adobe
Glass: Gorilla Glass Victus; Gorilla Glass DXC
Touch: 10-point multi-touch
Variable refresh rate: AMD FreeSync Premium

Battery: 40WHrs, 4S1P, 4-cell Li-ion
Power supply: Type-C 65W AC adapter (20V, 3.25A); whether a charger is included varies by country, region and model

Weight: 608 g (1.34 lbs)
Dimensions: 28.0 x 11.1 x 2.12 ~ 3.24 cm
Operating system: Windows 11 Home

Wi-Fi: Wi-Fi 6E (802.11ax) triple band 2x2
Bluetooth: 5.4 (may change with OS version)
Audio: Hi-Res certification (headphone); Dolby Atmos; 2-speaker system with Smart Amplifier Technology; built-in array microphone
Security: Microsoft Pluton security processor; built-in fingerprint sensor

Ports: 1x 3.5mm combo audio jack
Ports: 1x ROG XG Mobile interface and USB Type-C combo port (USB 3.2 Gen2, DisplayPort 1.4)
Ports: 1x UHS-II microSD card reader
Controls: View, Menu, Command Center and Armoury Crate buttons; L and R Hall Effect analog triggers and bumpers; ABXY buttons; 2 assignable grip buttons; D-pad; 2 full-size analog sticks; HD haptics; 6-axis IMU
```

**Gaps**
- Production's Rog Ally has no specs today. The page lists two processor options, so no single chip is claimed for the production unit; an admin should confirm which SKU the catalog means.
- Price, release date and a usable image are not on the page.

---

## Not included
- **Redmi Note 14 Pro+ 5G:** Both official Xiaomi pages (mi.com PH and global) returned HTTP 403 to the fetch tool, so no value could be read from a real page. Replaced by the Reno13 F 5G.
