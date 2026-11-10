# Smartphone catalog data pack, 10 Nov 2026 (S5-MA)

Run by Manuel (`s2302827-byte`, AI-assisted: yes, Claude Code). Task from Ikeee-AI: team-made catalog data, not user input, with legitimate sources (continues #201). **20 new phones plus the 4 existing production gadgets (3 of them reviewed and fixed, Infinix not sourceable).** Machine-readable copy: [`smartphones-2026-11-10.json`](smartphones-2026-11-10.json).

**Rules this pack follows**
- Every value was read from the official page in its **Source URL** on 10 Nov 2026. Nothing came from memory or from search-result summaries.
- If a source does not state a value, it is **left out and listed under Gaps**. No guessed prices, dates or chips.
- Not copied from TechSpecs (its terms forbid it, `docs/admin-catalog-guide.md`).
- This PR **does not change any database**. Only an admin can add data to production: enter each block with **Add Specs**, using that block's Source URL, then **Index All Pending**.
- The pages were first read with a fetch tool. Afterwards I **re-checked 164 key values directly in each page's own HTML** (processor, battery, charging, weight, IP rating, price, model codes and similar, across all 25 pages that loaded). All 164 were present (two Apple values only differed by a non-breaking space or hyphen). The other lines were not re-checked, so skim a few against the live page before entering.
- Pages that gave no usable specs: Xiaomi PH and global (HTTP 403), Infinix PH, HONOR 400 PH, Google Pixel 9 and Nothing Phone (3a) (their spec values are filled in by the browser, so only titles or labels came back). Those phones are not in the pack.

| # | Gadget | Action | Specs blocks | Price (Php) | Image |
| --- | --- | --- | --- | --- | --- |
| 1 | Samsung Galaxy S24 | add | 2 | 50990 | none found |
| 2 | OPPO Reno13 5G | add | 1 | not verified | yes |
| 3 | vivo V50 5G | add | 2 | 22999 | yes |
| 4 | realme 14 Pro+ 5G | add | 1 | not verified | none found |
| 5 | OPPO Reno13 F 5G | add | 1 | not verified | yes |
| 6 | Samsung Galaxy A56 5G | add | 1 | not verified | none found |
| 7 | Apple iPhone 16 | add | 1 | not verified | yes |
| 8 | Apple iPhone 16 Pro | add | 1 | not verified | yes |
| 9 | Apple iPhone 16e | add | 1 | not verified | yes |
| 10 | Samsung Galaxy S25 | add | 1 | 51990 | none found |
| 11 | Samsung Galaxy A36 5G | add | 1 | not verified | none found |
| 12 | OPPO Reno14 5G | add | 1 | not verified | yes |
| 13 | OPPO Reno14 F 5G | add | 1 | not verified | yes |
| 14 | OPPO Find X8 | add | 1 | not verified | yes |
| 15 | vivo X200 | add | 1 | not verified | yes |
| 16 | vivo X200 FE | add | 1 | not verified | yes |
| 17 | vivo X200 Pro | add | 1 | not verified | none found |
| 18 | realme 14 Pro 5G | add | 1 | not verified | none found |
| 19 | realme 13 Pro+ 5G | add | 1 | not verified | none found |
| 20 | ASUS ROG Phone 9 Pro | add | 1 | not verified | none found |
| 21 | Apple iPhone 15 | fix | 1 | not verified | yes |
| 22 | Infinix Infinix Note 50 Pro 5G+ (rename to NOTE 50 Pro+ 5G) | blocked | 0 | not verified | none found |
| 23 | POCO POCO X7 Pro (production says 'Poco x7 Pro') | fix | 1 | not verified | yes |
| 24 | ASUS ROG Ally (2023) | fix | 1 | not verified | none found |

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

## Apple iPhone 16 (add)

- **Name / Brand / Category:** iPhone 16 / Apple / Smartphone
- **Price (Php):** leave blank. Not on Apple's tech-specs page.
- **Release date:** leave blank. Year introduced: 2024. Apple's page gives only 'Year introduced', so no full date is entered.
- **Image link:** https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/iphone-16.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://support.apple.com/en-ph/121029 (accessed 2026-11-10; page text as returned by the fetch tool (full page); key values re-checked in the page HTML)

```text
Year introduced: 2024

Chip: A18 chip
CPU: 6-core CPU with 2 performance and 4 efficiency cores
GPU: 5-core GPU
Neural Engine: 16-core Neural Engine
Storage: 128GB, 256GB, 512GB

Display: Super Retina XDR, 6.1-inch (diagonal) all-screen OLED
Resolution: 2556-by-1179-pixel resolution at 460 ppi
Brightness: 1000 nits max (typical); 1600 nits peak (HDR); 2000 nits peak (outdoor)
Contrast ratio: 2,000,000:1 (typical)

Video playback: up to 22 hours
Video playback (streamed): up to 18 hours
Audio playback: up to 80 hours
Fast charge: up to 50% in 30 minutes with a 20W adapter or higher (USB-C) or a 30W adapter or higher (MagSafe)
MagSafe wireless charging: up to 25W
Qi2 wireless charging: up to 25W

Rear camera: 48MP Fusion Main, 26 mm, f/1.6, sensor-shift optical image stabilization
Rear camera: 12MP Ultra Wide, 13 mm, f/2.2, 120 degree field of view
Zoom: 2x optical zoom in, 2x optical zoom out; 4x optical zoom range; digital zoom up to 10x
Front camera: TrueDepth, 12MP, f/1.9
Video: 4K Dolby Vision recording at 24, 25, 30 or 60 fps

Width: 71.6 mm
Height: 147.6 mm
Depth: 7.80 mm
Weight: 170 grams
Water resistance: IP68 (maximum depth of 6 meters up to 30 minutes) under IEC standard 60529

Cellular: 5G sub-6 GHz and mmWave with 4x4 MIMO; Gigabit LTE with 4x4 MIMO
Wi-Fi: Wi-Fi 7 (802.11be) with 2x2 MIMO
Bluetooth: 5.3
Ultra Wideband: second-generation chip
NFC: with reader mode
Connector: USB-C (charging, DisplayPort, USB 2 up to 480Mb/s)
SIM: dual eSIM; iPhone 16 uses eSIM technology and is not compatible with physical SIM cards
```

**Gaps**
- No iOS version in the spec list.
- Price is not on the page.

---

## Apple iPhone 16 Pro (add)

- **Name / Brand / Category:** iPhone 16 Pro / Apple / Smartphone
- **Price (Php):** leave blank. Not on Apple's tech-specs page.
- **Release date:** leave blank. Year introduced: 2024. Apple's page gives only 'Year introduced', so no full date is entered.
- **Image link:** https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/121031-iphone-16-pro.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://support.apple.com/en-ph/121031 (accessed 2026-11-10; page text as returned by the fetch tool (full page); key values re-checked in the page HTML)

```text
Year introduced: 2024

Chip: A18 Pro chip
CPU: 6-core CPU with 2 performance and 4 efficiency cores
GPU: 6-core GPU
Neural Engine: 16-core Neural Engine
Storage: 128GB, 256GB, 512GB, 1TB

Display: 6.3-inch (diagonal) all-screen OLED
Resolution: 2622-by-1206-pixel resolution at 460 ppi
Refresh rate: ProMotion with adaptive refresh rates up to 120Hz
Brightness: 1000 nits max (typical); 1600 nits peak (HDR); 2000 nits peak (outdoor)

Video playback: up to 27 hours
Video playback (streamed): up to 22 hours
Audio playback: up to 85 hours
Battery: built-in rechargeable lithium-ion
MagSafe wireless charging: up to 25W with a 30W adapter or higher
Qi2 wireless charging: up to 15W
Qi wireless charging: up to 7.5W
Fast charge: up to 50% in around 30 minutes with a 20W adapter or higher and USB-C cable, or a 30W adapter or higher with MagSafe
Connector: USB-C (charging, DisplayPort, USB 3 up to 10Gb/s)

Main camera: 48MP Fusion, 24 mm, f/1.78, second-generation sensor-shift optical image stabilization
Telephoto: 12MP 5x Telephoto, 120 mm, f/2.8, 20 degree field of view
Ultra Wide: 48MP, 13 mm, f/2.2, 120 degree field of view
Optical zoom: 5x in, 2x out; 10x optical zoom range
Digital zoom: up to 25x (photo); up to 15x (video)
Front camera: 12MP, f/1.9
Video: 4K Dolby Vision recording at 24, 25, 30, 60, 100 (Fusion) or 120 fps (Fusion)

Width: 71.5 mm
Height: 149.6 mm
Depth: 8.25 mm
Weight: 199 grams
Water resistance: IP68 (maximum depth of 6 meters up to 30 minutes) under IEC standard 60529

Cellular: 5G (sub-6 GHz and mmWave) with 4x4 MIMO
Wi-Fi: Wi-Fi 7 (802.11be) with 2x2 MIMO
Bluetooth: 5.3
Ultra Wideband: second-generation chip
NFC: with reader mode
SIM: dual eSIM; not compatible with physical SIM cards
```

**Gaps**
- No iOS version in the spec list.
- Price is not on the page.

---

## Apple iPhone 16e (add)

- **Name / Brand / Category:** iPhone 16e / Apple / Smartphone
- **Price (Php):** leave blank. Not on Apple's tech-specs page.
- **Release date:** leave blank. Year introduced: 2025. Apple's page gives only 'Year introduced', so no full date is entered.
- **Image link:** https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/122208-iphone-16e.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://support.apple.com/en-ph/122208 (accessed 2026-11-10; page text as returned by the fetch tool; key values re-checked in the page HTML)

```text
Year introduced: 2025

Chip: A18 chip
CPU: 6-core CPU with 2 performance and 4 efficiency cores
GPU: 4-core GPU
Neural Engine: 16-core Neural Engine
Storage: 128GB, 256GB, 512GB

Display: Super Retina XDR, 6.1-inch (diagonal) all-screen OLED
Resolution: 2532-by-1170-pixel resolution at 460 ppi
Brightness: 800 nits max (typical); 1200 nits peak (HDR)
Contrast ratio: 2,000,000:1 (typical)

Video playback: up to 26 hours
Video playback (streamed): up to 21 hours
Audio playback: up to 90 hours
Battery: built-in rechargeable lithium-ion
Fast charge: up to 50% in 30 minutes with a 20W adapter or higher (sold separately) and USB-C cable
Wireless charging: works with Qi chargers (sold separately)

Rear camera: 2-in-1 system; 48MP Fusion Main, 26 mm, f/1.6; 12MP 2x Telephoto, 52 mm, f/1.6
Digital zoom: up to 10x
Front camera: TrueDepth, 12MP, f/1.9
Video: 4K Dolby Vision recording at 24, 25, 30 or 60 fps

Width: 71.5 mm
Height: 146.7 mm
Depth: 7.80 mm
Weight: 167 grams
Water resistance: IP68 (maximum depth of 6 meters up to 30 minutes) under IEC standard 60529

Modem: Apple C1 cellular modem
Wi-Fi: Wi-Fi 6 (802.11ax) with 2x2 MIMO
Bluetooth: 5.3
NFC: with reader mode
Connector: USB-C, USB 2 (up to 480Mb/s)
SIM: dual eSIM; iPhone 16e uses eSIM technology and is not compatible with physical SIM cards
```

**Gaps**
- No iOS version in the spec list.
- Price is not on the page.

---

## Samsung Galaxy S25 (add)

- **Name / Brand / Category:** Galaxy S25 / Samsung / Smartphone
- **Price (Php):** 51990. Samsung PH spec page: S25 256GB ₱51,990; 512GB ₱60,990. The 256GB price is used.
- **Release date:** leave blank. Not on the spec page.
- **Image link:** none verified. No product image URL on the page (only footer badges).

**Specs block. Source URL:** https://www.samsung.com/ph/smartphones/galaxy-s25/specs/ (accessed 2026-11-10; the page's summary block and FAQ as returned by the fetch tool (its main table did not come through); key values re-checked in the page HTML. S25 values only.)

```text
Chipset: Snapdragon 8 Elite
RAM: 12GB
Storage options: 256GB, 512GB

Display size: 6.2" full rectangle (6" with rounded corners)
Resolution: 2340 x 1080
Display protection: Corning Gorilla Glass Victus 2

Battery capacity: 4,000mAh
Playback: up to 29 hours (video and audio)

Rear cameras: 50MP main (F1.8), 10MP telephoto (F2.4), 12MP ultra-wide (F2.2)
Front camera: 12MP (F2.2)
Zoom: AI enhanced Nightography zoom

Dimensions: 146.9 x 70.5 x 7.2 mm
Weight: 162 g
Water resistance: IP68
```

**Gaps**
- Charging wattage, OS version, connectivity and SIM are not in the text I received. The page's FAQ is about Galaxy AI and cooling.
- Only the spec page's S25 values are used; a different Samsung page was reported to contradict the chipset, so it is not used.
- Release date is not on the page.

---

## Samsung Galaxy A36 5G (add)

- **Name / Brand / Category:** Galaxy A36 5G / Samsung / Smartphone
- **Price (Php):** leave blank. The page shows 'Not for sale' and unrendered price placeholders.
- **Release date:** leave blank. Not on the page.
- **Image link:** none verified. No image URL in the page text.

**Specs block. Source URL:** https://www.samsung.com/ph/smartphones/galaxy-a/galaxy-a36-5g-awesome-black-256gb-sm-a366bzktphl/ (accessed 2026-11-10; specification section of the page, verbatim part of the fetch; key values re-checked in the page HTML)

```text
Model: Galaxy A36 5G (SM-A366BZKTPHL)

CPU type: Octa-Core
CPU speed: 2.4 GHz, 1.8 GHz
Memory: 8 GB
Storage: 256 GB (233.4 GB available)

Display size: 6.7" full rectangle (6.5" with rounded corners)
Display technology: Super AMOLED
Resolution: 1080 x 2340 (FHD+)
Maximum refresh rate: 120 Hz
Brightness: increased brightness of 1,200 nits

Battery capacity (typical): 5000 mAh
Video playback time: up to 29 hours
Battery: not removable

Rear cameras: 50.0 MP + 8.0 MP + 5.0 MP (F1.8, F2.2, F2.4), auto focus, OIS
Front camera: 12.0 MP, F2.2
Zoom: digital zoom up to 10x
Video recording: UHD 4K (3840 x 2160) at 30fps
Slow motion: 240fps at HD

Dimensions: 162.9 x 78.2 x 7.4 mm
Weight: 195 g
Operating system: Android
Software support: 6 generations of OS upgrades and 6 years of security updates; security updates valid until 31 March 2031
Water resistance: IP67

Wi-Fi: 802.11a/b/g/n/ac/ax 2.4GHz+5GHz
Bluetooth: v5.4
USB: Type-C, USB 2.0
SIM: dual SIM; Nano-SIM and embedded SIM
```

**Gaps**
- Samsung's PH page names no chipset, so none is claimed.
- Charging wattage and NFC are not in the spec table. Price and release date are not on the page.
- The tool's own summary of the end of this page contradicted the spec table (battery, OS version); it was not used.

---

## OPPO Reno14 5G (add)

- **Name / Brand / Category:** Reno14 5G / OPPO / Smartphone
- **Price (Php):** leave blank. Not on the page.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://www.oppo.com/content/dam/oppo/common/mkt/v2-2/reno14-series/specs/reno14/white-green.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://www.oppo.com/ph/smartphones/series-reno/reno14/specs/ (accessed 2026-11-10; page text as returned by the fetch tool; key values re-checked in the page HTML)

```text
Model: OPPO Reno14 5G (CPH2737)

SoC: MediaTek Dimensity 8350
CPU: 8 cores
GPU: ARM G615 MC6 at 1400MHz
RAM and storage: 12GB + 512GB and 12GB + 256GB
RAM type: LPDDR5X
Storage type: UFS 3.1

Display: 6.59 inches AMOLED (flexible)
Resolution: 1256 x 2760 pixels
Refresh rate: maximum 120Hz (60/90/120Hz)
Touch sampling rate: maximum 240Hz
Brightness: 600 nits (typical); 1200 nits (typical, HBM)
Cover glass: Corning Gorilla Glass 7i

Battery: 6000mAh/23.52Wh (typical); 5840mAh/22.90Wh (rated)
Fast charging: 80W SUPERVOOC (11V/7.3A), plus VOOC 3.0, PD and PPS

Rear cameras: 50MP wide f/1.8 with 2-axis OIS; 8MP ultra-wide f/2.2; 50MP telephoto f/2.8 with 2-axis OIS
Front camera: 50MP f/2.0
Zoom: optical up to 3.5X (video), digital up to 18X
Video: rear up to 4K at 60fps or 30fps

Dimensions: about 157.90 mm x 74.73 mm x 7.42 mm
Weight: about 187 g (varies by configuration)
Operating system: ColorOS 15.0

Wi-Fi: Wi-Fi 6 (802.11ax), 2x2 MIMO
Bluetooth: 5.4, Low Energy
NFC: Supported (depends on region)
USB: Type-C
SIM: Nano-SIM plus eSIM
```

**Gaps**
- No IP rating is listed on the page.
- Price and release date are not on the page.

---

## OPPO Reno14 F 5G (add)

- **Name / Brand / Category:** Reno14 F 5G / OPPO / Smartphone
- **Price (Php):** leave blank. Not on the page.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://www.oppo.com/content/dam/oppo/common/mkt/v2-2/reno14-series/specs/reno14-f/blue-green.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://www.oppo.com/ph/smartphones/series-reno/reno14-f-5g/specs/ (accessed 2026-11-10; MODEL-EXTRACTED pass over the page (not verbatim); 9 key values re-checked in the page HTML. Skim the rest against the live page.)

```text
Model: OPPO Reno14 F 5G (CPH2743)

SoC: Qualcomm Snapdragon 6 Gen 1 Mobile Platform
CPU: 8 cores
GPU: Adreno 710@676MHz
RAM and storage: 8GB + 256GB; 12GB + 256GB; 12GB + 512GB
RAM type: LPDDR4X
Storage type: UFS 3.1
Storage card: Supported

Display: 6.57 inches AMOLED (flexible)
Resolution: 2372 x 1080 pixels
Refresh rate: maximum 120Hz (60/90/120Hz)
Touch sampling rate: maximum 240Hz
Brightness: 600 nits (typical); 1400 nits (typical, HBM)
Pixel density: 397 PPI

Battery: 6000mAh/23.52Wh (typical); 5830mAh/22.86Wh (rated)
Fast charging: 45W SUPERVOOC, 33W SUPERVOOC, 15W VOOC, 45W PPS

Rear cameras: 50MP wide f/1.8 with OIS; 8MP ultra-wide f/2.2; 2MP macro f/2.4
Front camera: 32MP f/2.0 with AF

Dimensions: about 158.12 mm x 74.97 mm x 7.78 mm (Opal Blue) or 7.74 mm (Luminous Green)
Weight: about 180 g
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
- The first read of this page was a summary, not page text; only 9 values were re-checked.

---

## OPPO Find X8 (add)

- **Name / Brand / Category:** Find X8 / OPPO / Smartphone
- **Price (Php):** leave blank. Not on the page.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://www.oppo.com/content/dam/oppo/common/mkt/v2-2/find-x8-series-en/find-x8/products/black-pink-titanium.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header.

**Specs block. Source URL:** https://www.oppo.com/ph/smartphones/series-find-x/find-x8/specs/ (accessed 2026-11-10; page text as returned by the fetch tool (full page); key values re-checked in the page HTML)

```text
Model: OPPO Find X8 (CPH2651)

SoC: MediaTek Dimensity 9400
CPU: 8 cores
GPU: Immortalis G925 MC12
RAM and storage: 12GB + 256GB
RAM type: LPDDR5X
Storage type: UFS 4.0

Display: 6.59 inches (diagonal) AMOLED (flexible)
Resolution: FHD+ (2760 x 1256 pixels)
Refresh rate: maximum 120Hz
Touch sampling rate: maximum 240Hz
Brightness: 800 nits (typical); HBM 1600 nits (typical); peak 4500 nits (typical, 1% APL)
Pixel density: 460 PPI
Cover glass: Corning Gorilla Glass 7i

Battery: 5630mAh/21.79Wh (typical); 5490mAh/21.25Wh (rated)
Fast charging: 80W SUPERVOOC 2.0, SUPERVOOC, VOOC 4.0, PD (9V/1.3A); wireless 50W AIRVOOC

Rear cameras: 50MP ultra-wide f/2.0 (120 degrees); 50MP wide f/1.8 with 2-axis OIS; 50MP telephoto f/2.6 with 2-axis OIS
Front camera: 32MP f/2.4
Zoom: optical up to 3X, digital up to 18X

Dimensions: about 157.35 mm x 74.33 mm x 7.85 mm (Space Black, Star Grey) or 7.95 mm (Shell Pink)
Weight: about 193 g
Operating system: ColorOS 15.0

Wi-Fi: Wi-Fi 6 (802.11ax), Wi-Fi 5 (802.11ac), 802.11a/b/g/n
Bluetooth: 5.4, Low Energy
USB: Type-C
NFC: supported (HCE payment supported)
SIM: Nano-SIM plus eSIM
```

**Gaps**
- No IP rating is listed on the page.
- Price and release date are not on the page.

---

## vivo X200 (add)

- **Name / Brand / Category:** X200 / vivo / Smartphone
- **Price (Php):** leave blank. Not on the param page (a shop listing outside this pack was out of stock and is not used).
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://asia-exstatic-vivofs.vivo.com/PSee2l50xoirPK7y/1733828737707/14b9be8a31647955186b0468a125106d.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header. Listed on the page as the Green colour image.

**Specs block. Source URL:** https://www.vivo.com/ph/products/param/x200 (accessed 2026-11-10; page text as returned by the fetch tool (full page); key values re-checked in the page HTML)

```text
Processor: Dimensity 9400
CPU core count: Octa-core
Process node: 3 nm
CPU clock speed: 1 x 3.626 GHz + 3 x 3.3 GHz + 4 x 2.4 GHz

RAM + ROM: 12 GB + 256 GB / 16 GB + 512 GB
RAM type: LPDDR5X
Expandable RAM capacity: 16 GB
Expandable ROM capacity: Not supported

Display size: 6.67"
Resolution: 2800 x 1260
Display type: AMOLED
Refresh rate: 120 Hz
Pixel density: 460 PPI
Local peak brightness: 4500 nits

Battery: single cell, typical capacity 5800 mAh (3.84V), typical energy 22.28 Wh, rated capacity 5695 mAh
Charging power: 90W
Battery type: Li-ion

Cameras: front 32 MP; rear 50 MP + 50 MP + 50 MP
Aperture: front f/2.0; rear f/1.57 (50 MP) + f/2.0 (50 MP) + f/2.57 (50 MP)

Dimensions: 160.27 x 74.81 x 7.99 mm
Weight: 202 g (Green)
Back cover: glass (Green)
Fingerprint sensor: in-display optical
Operating system: Funtouch OS 15 (Android 15)
Ingress protection: IP68 and IP69

Wi-Fi: Wi-Fi 6; Wi-Fi 7; 2x2 MIMO
Bluetooth: 5.4
USB: USB 2.0
NFC: Supported
SIM: 2 nano SIMs, dual SIM dual standby
```

**Gaps**
- The page's own text is inconsistent in places (a footnote mentions the X200 Pro; another gives the screen as 6.78 inches measured in the full rectangle). The spec value is used.
- Price and release date are not on the page.

---

## vivo X200 FE (add)

- **Name / Brand / Category:** X200 FE / vivo / Smartphone
- **Price (Php):** leave blank. Not on the param page.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** https://asia-exstatic-vivofs.vivo.com/PSee2l50xoirPK7y/1752464603123/b22b7ebd75d204183fc0fa67b211be44.png. Checked 10 Nov: HTTP 200, image/png, viewed, no Cross-Origin-Resource-Policy header. Listed on the page as the Blue colour image.

**Specs block. Source URL:** https://www.vivo.com/ph/products/param/x200-fe (accessed 2026-11-10; page text as returned by the fetch tool (full page); key values re-checked in the page HTML)

```text
Processor: Dimensity 9300+
CPU core count: 8
Process node: 4 nm
CPU clock speed: 1 x 3.4 GHz + 3 x 2.85 GHz + 4 x 2.0 GHz

RAM + ROM: 12 GB + 512 GB
RAM type: LPDDR5X
ROM type: UFS 3.1
Expandable RAM capacity: 16 GB
Expandable ROM capacity: Not supported

Display size: 6.31"
Resolution: 2640 x 1216
Display type: AMOLED
Refresh rate: LTPO adaptive (120/90/72/60 Hz)
Pixel density: 460 PPI
Local peak brightness: 5000 nits

Battery: single cell, typical capacity 6500 mAh (3.83V), typical energy 24.9 Wh, rated capacity 6340 mAh
Charging power: 90W FlashCharge
Battery type: Li-ion

Cameras: front 50 MP; rear 50 MP + 8 MP + 50 MP
Aperture: front f/2.0; rear f/1.88 (50 MP) + f/2.2 (8 MP) + f/2.65 (50 MP)

Dimensions: 150.83 x 71.76 x 7.99 mm
Weight: 186 g
Back cover: glass
Fingerprint sensor: in-display optical
Operating system: Funtouch OS 15 (Android 15)
Ingress protection: IP68 and IP69

Wi-Fi: Wi-Fi 6; Wi-Fi 7; 2x2 MIMO
Bluetooth: 5.4
USB: USB 2.0
NFC: reader/writer mode; card emulation mode
SIM: 2 nano SIMs, dual SIM dual standby
```

**Gaps**
- Price and release date are not on the page.

---

## vivo X200 Pro (add)

- **Name / Brand / Category:** X200 Pro / vivo / Smartphone
- **Price (Php):** leave blank. Not on the param page.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** none verified. The only image URL on the param page is a site header image, not a product photo.

**Specs block. Source URL:** https://www.vivo.com/ph/products/param/x200-pro (accessed 2026-11-10; page text as returned by the fetch tool (full page); key values re-checked in the page HTML)

```text
Processor: Dimensity 9400
CPU core count: Octa-core
Process node: 3 nm
CPU clock speed: 1 x 3.626 GHz + 3 x 3.3 GHz + 4 x 2.4 GHz

RAM + ROM: 16 GB + 512 GB
RAM type: LPDDR5X
Expandable RAM capacity: 16 GB
Expandable ROM capacity: Not supported

Display size: 6.78"
Resolution: 2800 x 1260
Display type: AMOLED
Refresh rate: 0.1 to 120 Hz
Pixel density: 452 PPI
Local peak brightness: 4500 nits

Battery: single cell, typical capacity 6000 mAh (3.84V), typical energy 23.04 Wh, rated capacity 5865 mAh
Charging power: 90W FlashCharge; 30W wireless charging
Battery type: Li-ion

Cameras: front 32 MP; rear 50 MP + 50 MP + 200 MP
Aperture: front f/2.0; rear f/1.57 (50 MP) + f/2.0 (50 MP) + f/2.67 (200 MP)

Dimensions: 162.36 x 75.95 x 8.49 mm (Titanium)
Weight: 228 g (Titanium)
Back cover: glass (Titanium)
Fingerprint sensor: 3D ultrasonic single-point
Operating system: Funtouch OS 15 (Android 15)
Ingress protection: IP68 and IP69

Wi-Fi: Wi-Fi 6; Wi-Fi 7; 2x2 MIMO
Bluetooth: 5.4
USB: USB 3.2 Gen 1
NFC: Supported (the sensing area is in the middle of the back of the phone)
SIM: 2 nano SIMs plus eSIM, dual SIM dual standby
```

**Gaps**
- Price, release date and a product image are not on the page.

---

## realme 14 Pro 5G (add)

- **Name / Brand / Category:** 14 Pro 5G / realme / Smartphone
- **Price (Php):** leave blank. Not on the spec page (the only price on it belongs to a different phone).
- **Release date:** leave blank. Not stated by the page.
- **Image link:** none verified. The only image URLs on the page are colour swatches, not product photos.

**Specs block. Source URL:** https://www.realme.com/ph/realme-14-pro-5g/specs (accessed 2026-11-10; page text as returned by the fetch tool; values kept close to the page wording; key values re-checked in the page HTML)

```text
Chipset: MediaTek Dimensity 7300 Energy (5G; 4nm)
CPU: octa-core; 4x ARM Cortex-A78 at up to 2.5GHz; 4x ARM Cortex-A55 at up to 2.0GHz
GPU: Arm Mali-G615

RAM: 12GB (up to 14GB dynamic RAM expansion)
Storage: 256GB

Display: 6.77" curved OLED
Resolution: 2392x1080 (FHD+)
Peak brightness: 4,500 nits
PWM dimming: 3840Hz
Refresh rate: 120Hz
Touch sampling rate: up to 180Hz
Contrast ratio: 5,000,000:1
Color gamut: 100% DCI-P3

Battery: 6000mAh (typ.); 5860mAh (rated)
Charging adapter: 45W SUPERVOOC charging adapter (included in the box, per the page's charging line)
Packing list: the page's package list says 80W SUPERVOOC charging adapter x1 (the page contradicts itself)
Charging port: USB Type-C

Main rear camera: 50MP Sony IMX882, OIS, f/1.8
Rear monochrome camera: 2MP, f/2.4
Front camera: 16MP Sony IMX480, f/2.4
Rear video: 4K at 30fps

Dimensions: length 162.75 mm, width 74.92 mm, depth approx. 7.55 mm (Pearl White) or 7.79 mm (Suede Grey)
Weight: approx. 179 g (Pearl White); 181.5 g (Suede Grey)
Operating system: realme UI 6.0, Android 15
Water and dust resistance: IP69, IP68, IP66 rated

Network: 5G supported, dual standby, SA/NSA
Wi-Fi: Wi-Fi 6 (802.11ax), Wi-Fi 5 (802.11ac)
Bluetooth: 5.4
USB: Type-C with OTG
SIM: 2 nano SIM slots
```

**Gaps**
- The page lists a 45W adapter in one place and an 80W adapter in another; both are quoted as printed.
- Price and release date are not on the page.

---

## realme 13 Pro+ 5G (add)

- **Name / Brand / Category:** 13 Pro+ 5G / realme / Smartphone
- **Price (Php):** leave blank. Not on the spec page (the only price on it belongs to a different phone).
- **Release date:** leave blank. Not stated by the page.
- **Image link:** none verified. The only image URL found is a colour swatch, not a product photo.

**Specs block. Source URL:** https://www.realme.com/ph/more-products/realme-13-pro-plus-5g/specs (accessed 2026-11-10; page text as returned by the fetch tool; values kept close to the page wording; key values re-checked in the page HTML)

```text
Chipset: Snapdragon 7s Gen 2
CPU: 4nm process, octa-core, up to 2.4GHz
GPU: Adreno 710

RAM: 12GB (up to 12GB + 12GB dynamic RAM)
Storage: 256GB / 512GB

Display: 6.7 inches OLED
Resolution: 2412 x 1080 (FHD+)
Screen ratio: 93%
Contrast ratio: 5000000:1
Color gamut: 100% DCI-P3
Refresh rate: up to 120Hz
Brightness: typical 600nits, global maximum 1200nits, local peak 2000nits

Battery: 5200mAh (typ); 5050mAh (min)
Charging: 80W SUPERVOOC, with an 80W adapter included; USB Type-C

Rear cameras: 50MP Sony LYT-600 periscope (f/2.65, OIS); 50MP Sony LYT-701 OIS main (f/1.88); 8MP ultra-wide (f/2.2)
Front camera: 32MP Sony selfie camera (f/2.45)
Rear video: 4K at 30fps

Dimensions: length 161.34 mm, width 73.91 mm; depth approx. 8.41 mm (leather) or 8.23 mm (glass)
Weight: approx. 185.5 g (leather); 190 g (glass)
Operating system: realme UI 5.0 based on Android 14

Cellular: 5G + 5G dual mode, SA/NSA
Wi-Fi: Wi-Fi 6 (802.11a/b/g/n/ac/ax)
Bluetooth: 5.2
NFC: supported
SIM: 2 nano SIM slots
```

**Gaps**
- No IP rating is on the page.
- Price and release date are not on the page.
- This phone's page sits under 'more products' on realme PH, so it may be an older model.

---

## ASUS ROG Phone 9 Pro (add)

- **Name / Brand / Category:** ROG Phone 9 Pro / ASUS / Smartphone
- **Price (Php):** leave blank. The ASUS PH page says 'estore price starting at' with no amount.
- **Release date:** leave blank. Not stated by the page.
- **Image link:** none verified. Only extension-less 250px thumbnails (dlcdnwebimgs.asus.com .../w250/fwebp), too small to use.

**Specs block. Source URL:** https://rog.asus.com/ph/phones/rog-phone-9-pro/spec/ (accessed 2026-11-10; page text as returned by the fetch tool (passed through a small model, so not character-exact); key values re-checked in the page HTML)

```text
Model: ROG Phone 9 Pro (page lists two models: ROG Phone 9 Pro Edition and ROG Phone 9 Pro)

Processor: Qualcomm Snapdragon 8 Elite Mobile Platform 4.3GHz, 64-bit, octa-core
GPU: Qualcomm Adreno 830
Memory (ROG Phone 9 Pro Edition): LPDDR5X 24GB
Memory (ROG Phone 9 Pro): LPDDR5X 16GB
Storage (ROG Phone 9 Pro Edition): UFS 4.0 1TB
Storage (ROG Phone 9 Pro): UFS 4.0 512GB

Display: 6.78 inch FHD+ 2400 x 1080

Wired charging: output 3.3-21V at 3.25A, compatible with 65W chargers, supports QC5.0 / PD 3.0
Wireless charging: output up to 15W, compatible with Qi 1.3

Video recording: 8K UHD (7680 x 4320) at 30 fps from the main rear camera; 4K UHD at 30 / 60 fps from the main rear camera
Rear cameras: 50MP main and 13MP ultra-wide (named in the video recording line)

Operating system: Android 15
Water resistance: IP68

Wireless: 802.11 be/ax/ac/a/b/g/n; 2.4GHz / 5GHz / 6GHz Wi-Fi; Bluetooth 5.4 with aptX Adaptive and aptX Lossless; Wi-Fi Direct; NFC
Navigation: GPS (L1/L5), Glonass, Galileo, BeiDou, QZSS and NavIC
Audio: multi-magnet dual stereo speakers; 3.5mm headphone jack
```

**Gaps**
- Battery capacity, camera details beyond the video line, dimensions, weight and SIM are not on the page.
- Price and release date are not on the page.
- The page lists two memory and storage configurations side by side; both are given.

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
- **HONOR 400:** The honor.com PH spec page loaded but every spec row was empty (the values are filled in by the browser), so nothing could be read. Replaced by the iPhone 16e.
- **Google Pixel 9:** Google Store's spec page returned no text without a browser. Replaced by the OPPO Reno14 F 5G.
- **Nothing Phone (3a):** The Nothing PH product page has marketing taglines but no specification text. Replaced by the vivo X200 Pro.
