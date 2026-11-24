import { describe, expect, it } from 'vitest'
import { countKeySpecs, extractKeySpecs, extractMoreSpecs, extractVariants, isWaterResistant } from './keySpecs'

const samsung = 'https://www.samsung.com/ph/smartphones/galaxy-s24/specs/'

describe('extractKeySpecs', () => {
  it('reads the four key specs from sourced text', () => {
    const specs = [
      { content: '6.2-inch Dynamic AMOLED 2X display, FHD+ (2340 x 1080), 120Hz refresh rate.', source_url: samsung },
      { content: 'Rear cameras: 50MP main (f/1.8), 12MP ultra-wide (f/2.2) and 10MP telephoto (f/2.4).', source_url: samsung },
      { content: 'Memory: 8 GB · Internal storage: 128 GB, 256 GB, 512 GB', source_url: 'https://www.samsung.com/ph/compare/' },
    ]
    const k = extractKeySpecs(specs)
    expect(k.refresh).toEqual({ value: '120', unit: 'Hz', source: 'samsung.com' })
    expect(k.camera).toEqual({ value: '50', unit: 'MP', source: 'samsung.com' })
    expect(k.ram).toMatchObject({ value: '8', unit: 'GB' })
    expect(k.storage).toMatchObject({ value: '128', unit: 'GB', variants: true })
    expect(countKeySpecs(k)).toBe(4)
  })

  it('reads Apple-style lines', () => {
    const k = extractKeySpecs([
      { content: 'Storage: 128GB, 256GB, 512GB', source_url: 'https://support.apple.com/en-ph/111831' },
      { content: 'Rear camera: 48MP Main, 26 mm, f/1.6', source_url: 'https://support.apple.com/en-ph/111831' },
    ])
    expect(k.storage).toEqual({ value: '128', unit: 'GB', variants: true, source: 'support.apple.com' })
    expect(k.camera.value).toBe('48')
    expect(k.ram).toBeNull()
    expect(k.refresh).toBeNull()
  })

  it('shows terabytes and leaves unstated specs null', () => {
    const k = extractKeySpecs([{ content: 'Storage options: 256GB, 512GB, 1TB', source_url: null }])
    expect(k.storage).toEqual({ value: '256', unit: 'GB', variants: true, source: null })
    expect(extractKeySpecs([{ content: 'Storage: 1TB' }]).storage).toMatchObject({ value: '1 TB', unit: '' })
    expect(countKeySpecs(extractKeySpecs([]))).toBe(0)
  })

  it('does not take battery or other numbers for RAM', () => {
    const k = extractKeySpecs([{ content: '4000mAh battery; up to 29 hours video playback.' }])
    expect(countKeySpecs(k)).toBe(0)
  })

  it('reads OPPO-style combined RAM and storage lines (bug seen on production, 13 Nov)', () => {
    const k = extractKeySpecs([
      { content: 'RAM and storage: 12GB + 256GB\nRAM type: LPDDR5X\nStorage type: UFS 4.0', source_url: 'https://www.oppo.com/ph/' },
    ])
    expect(k.ram).toMatchObject({ value: '12', unit: 'GB' })
    expect(k.storage).toMatchObject({ value: '256', unit: 'GB' })
  })

  it('reads several combined variants', () => {
    const k = extractKeySpecs([{ content: 'RAM + ROM: 8GB + 256GB / 12GB + 512GB' }])
    expect(k.ram).toMatchObject({ value: '8', variants: true })
    expect(k.storage).toMatchObject({ value: '256', variants: true })
  })

  it('never takes the tail of a bigger number', () => {
    const k = extractKeySpecs([{ content: 'Storage: 256GB\nRAM type: LPDDR5X' }])
    expect(k.ram).toBeNull()
    expect(k.storage.value).toBe('256')
  })

  it('ignores PWM dimming and touch sampling when reading the refresh rate', () => {
    const k = extractKeySpecs([{ content: 'PWM dimming: 3840Hz\nRefresh rate: 120Hz\nTouch sampling rate: up to 180Hz' }])
    expect(k.refresh.value).toBe('120')
  })

  it('takes the highest rate from an adaptive refresh line', () => {
    const k = extractKeySpecs([{ content: 'Refresh rate: LTPO adaptive (120/90/72/60 Hz)' }])
    expect(k.refresh.value).toBe('120')
  })

  it('reads POCO-style "RAM with storage" lines', () => {
    const k = extractKeySpecs([{ content: '• RAM & Storage: 8GB or 12GB LPDDR5X RAM with 256GB or 512GB UFS 4.0 storage.' }])
    expect(k.ram.value).toBe('8')
    expect(k.storage.value).toBe('256')
  })

  it('reads labelled editions and skips expandable RAM', () => {
    const k = extractKeySpecs([
      { content: 'Memory (Pro Edition): LPDDR5X 24GB\nMemory (Pro): LPDDR5X 16GB\nStorage (Pro Edition): UFS 4.0 1TB\nStorage (Pro): UFS 4.0 512GB\nExpandable RAM capacity: 16 GB' },
    ])
    expect(k.ram).toMatchObject({ value: '16', variants: true })
    expect(k.storage).toMatchObject({ value: '512', unit: 'GB', variants: true })
  })

  it('reads "rear 50 MP" camera lists and trims 50.0', () => {
    expect(extractKeySpecs([{ content: 'Cameras: front 32 MP; rear 50 MP + 50 MP + 200 MP' }]).camera.value).toBe('50')
    expect(extractKeySpecs([{ content: 'Main camera: 50.0 MP' }]).camera.value).toBe('50')
  })

  it('keeps variants listed with semicolons together', () => {
    const k = extractKeySpecs([{ content: 'RAM and storage: 8GB + 256GB; 12GB + 256GB; 12GB + 512GB' }])
    expect(k.ram).toMatchObject({ value: '8', variants: true })
    expect(k.storage).toMatchObject({ value: '256', variants: true })
  })

  it('picks RAM and storage from the same base variant', () => {
    const k = extractKeySpecs([{ content: 'RAM and storage: 12GB + 512GB; 8GB + 256GB' }])
    expect(k.ram.value).toBe('8')
    expect(k.storage.value).toBe('256')
    expect(extractKeySpecs([{ content: 'RAM and storage: 12GB + 256GB' }]).ram.variants).toBeUndefined()
  })
})

describe('extractVariants', () => {
  it('lists paired variants, standard first', () => {
    const v = extractVariants([{ content: 'RAM and storage: 12GB + 512GB; 8GB + 256GB; 12GB + 256GB', source_url: 'https://www.oppo.com/ph/x' }])
    expect(v.pairs).toEqual([
      { ram: 8, storage: 256 },
      { ram: 12, storage: 256 },
      { ram: 12, storage: 512 },
    ])
    expect(v.source).toBe('oppo.com')
  })

  it('lists separate options and leaves out RAM expansion', () => {
    const v = extractVariants([{ content: 'RAM: 12GB (up to 14GB dynamic RAM expansion)\nStorage: 128GB, 256GB, 1TB' }])
    expect(v.pairs).toEqual([])
    expect(v.ram).toEqual([12])
    expect(v.storage).toEqual([128, 256, 1024])
  })

  it('is null for a single variant', () => {
    expect(extractVariants([{ content: 'RAM and storage: 12GB + 256GB' }])).toBeNull()
    expect(extractVariants([])).toBeNull()
  })
})

// Lines below copy the formats the saved production sources use (checked 14 Nov 2026).
const more = (content, source_url = null) => extractMoreSpecs([{ content, source_url }])

describe('extractMoreSpecs: battery', () => {
  it('takes the typical capacity, not the rated one, whichever comes first (OPPO, realme)', () => {
    expect(more('Battery: 5450mAh/21.37Wh (rated); 5600mAh/21.96Wh (typical)').battery).toMatchObject({ value: '5600', unit: 'mAh', amount: 5600 })
    expect(more('Battery: 5200mAh (typ); 5050mAh (min)').battery.value).toBe('5200')
  })

  it('reads vivo, Samsung and POCO lines', () => {
    expect(more('Battery: single cell, typical capacity 6000 mAh (3.84V), typical energy 23.04 Wh, rated capacity 5865 mAh').battery.value).toBe('6000')
    expect(more('Battery capacity: 4,000mAh').battery.value).toBe('4000')
    expect(more('Battery capacity (typical): 5000 mAh\nBattery: not removable').battery.value).toBe('5000')
    expect(more('• Battery & Charging: 6000mAh battery with 90W HyperCharge support.').battery.value).toBe('6000')
  })

  it('is null when only the battery type or watt-hours are stated (Apple, ASUS)', () => {
    expect(more('Battery: built-in rechargeable lithium-ion\nBattery type: Li-ion').battery).toBeNull()
    expect(more('Battery: 40WHrs, 4S1P, 4-cell Li-ion').battery).toBeNull()
  })
})

describe('extractMoreSpecs: charging', () => {
  it('takes the highest wired power stated (OPPO, POCO, ASUS)', () => {
    expect(more('Fast charging: 45W SUPERVOOC, 33W SUPERVOOC, 15W VOOC, 45W PPS').charging).toMatchObject({ value: '45', unit: 'W', amount: 45 })
    expect(more('Charging: 90W HyperCharge; charges to 100% in 42 minutes').charging.value).toBe('90')
    expect(more('Wired charging: output 3.3-21V at 3.25A, compatible with 65W chargers, supports QC5.0 / PD 3.0').charging.value).toBe('65')
  })

  it('never counts wireless charging (OPPO, vivo, ASUS)', () => {
    expect(more('Fast charging: 80W SUPERVOOC 2.0, SUPERVOOC, VOOC 4.0, PD (9V/1.3A); wireless 50W AIRVOOC').charging.value).toBe('80')
    expect(more('Charging power: 90W FlashCharge; 30W wireless charging').charging.value).toBe('90')
    expect(more('Wireless charging: output up to 15W, compatible with Qi 1.3').charging).toBeNull()
  })

  it('does not take a minimum adapter, a packing list or protocols as the charging power (Apple, realme, OPPO)', () => {
    expect(more('Fast charge: up to 50% in 30 minutes with a 20W adapter or higher (sold separately)\nMagSafe wireless charging: up to 25W').charging).toBeNull()
    expect(more('Packing list: 80W SUPERVOOC charging adapter x1').charging).toBeNull()
    expect(more('Fast charging protocols: SUPERVOOC 2.0, SUPERVOOC, VOOC 3.0, PD2.0 (9V/1.5A)').charging).toBeNull()
    expect(more('Power supply: Type-C 65W AC adapter (20V, 3.25A)').charging).toBeNull()
  })
})

describe('extractMoreSpecs: chip', () => {
  it('keeps the chip name and drops clocks and notes (ASUS, realme, POCO)', () => {
    expect(more('Processor: Qualcomm Snapdragon 8 Elite Mobile Platform 4.3GHz, 64-bit, octa-core').chip).toMatchObject({ value: 'Qualcomm Snapdragon 8 Elite', unit: '' })
    expect(more('Chipset: MediaTek Dimensity 7300 Energy (5G; 4nm)').chip.value).toBe('MediaTek Dimensity 7300 Energy')
    expect(more('• Processor: MediaTek Dimensity 8400-Ultra (4nm octa-core up to 3.25GHz with Mali-G720 GPU).').chip.value).toBe('MediaTek Dimensity 8400-Ultra')
  })

  it('reads Apple, OPPO, vivo and Samsung labels', () => {
    expect(more('Chip: A18 Pro chip').chip.value).toBe('A18 Pro')
    expect(more('A16 Bionic chip.').chip.value).toBe('A16 Bionic')
    expect(more('SoC: Qualcomm Snapdragon 6 Gen 1 Mobile Platform').chip.value).toBe('Qualcomm Snapdragon 6 Gen 1')
    expect(more('Processor: Dimensity 9300+').chip.value).toBe('Dimensity 9300+')
    expect(more('Processor: Exynos 2400').chip.value).toBe('Exynos 2400')
    // Samsung's A56 sheet states the chip as a sentence (seen on prod, 24 Nov 2026).
    expect(more('Processor: Galaxy A56 5G is powered by the Exynos 1580 chipset').chip.value).toBe('Exynos 1580')
    expect(more('Processor: Galaxy A36 5G features the Snapdragon 6 Gen 3').chip.value).toBe('Snapdragon 6 Gen 3')
    expect(more('Chipset: Snapdragon 8 Gen 3 chipset').chip.value).toBe('Snapdragon 8 Gen 3')
  })

  it('does not take CPU core lines or other chips', () => {
    expect(more('CPU type: Octa-Core\nCPU speed: 2.4 GHz, 1.8 GHz').chip).toBeNull()
    expect(more('Ultra Wideband: second-generation chip\nSecurity: Microsoft Pluton security processor').chip).toBeNull()
  })
})

describe('extractMoreSpecs: weight', () => {
  it('takes the first finish listed (realme, vivo) and reads grams (Apple, Infinix)', () => {
    expect(more('Weight: approx. 185.5 g (leather); 190 g (glass)').weight).toMatchObject({ value: '185.5', unit: 'g', amount: 185.5 })
    expect(more('Weight: 189 g (Black); 199 g (Purple, Red)').weight.value).toBe('189')
    expect(more('Weight: 167 grams').weight.value).toBe('167')
    expect(more('Weight: 209 grams (7.37 oz)').weight.value).toBe('209')
    expect(more('Weight: about 187 g (varies by configuration)').weight.value).toBe('187')
  })

  it('is null without a weight line', () => {
    expect(more('Battery: 5000 mAh\nStorage: 256 GB').weight).toBeNull()
  })
})

describe('extractMoreSpecs: water resistance', () => {
  it('lists every IP code stated (realme, vivo, Apple, Samsung)', () => {
    expect(more('Water and dust resistance: IP69, IP68, IP66 rated').water).toMatchObject({ value: 'IP66 / IP68 / IP69', codes: ['IP66', 'IP68', 'IP69'] })
    expect(more('Ingress protection: IP68; IP69').water.value).toBe('IP68 / IP69')
    expect(more('Water resistance: IP68 (maximum depth of 6 meters up to 30 minutes) under IEC standard 60529').water.value).toBe('IP68')
    expect(more('Water resistance: IP67').water.value).toBe('IP67')
  })

  it('does not read IPS display panels as a rating', () => {
    expect(more('Display: 7-inch, FHD (1920 x 1080) 16:9, IPS-level').water).toBeNull()
  })

  it('treats IP67 and better as water resistant', () => {
    expect(isWaterResistant(more('Water resistance: IP67').water)).toBe(true)
    expect(isWaterResistant(more('Rated IPX8').water)).toBe(true)
    expect(isWaterResistant(more('Splash resistance: IP54').water)).toBe(false)
    expect(isWaterResistant(null)).toBe(false)
  })
})

describe('extractMoreSpecs: screen size', () => {
  it('reads inches in every source format', () => {
    expect(more('Display: 6.78 inch FHD+ 2400 x 1080').screen).toMatchObject({ value: '6.78', unit: 'in', amount: 6.78 })
    expect(more('Display: 6.77" curved OLED').screen.value).toBe('6.77')
    expect(more('Display: 6.59 inches (diagonal) AMOLED (flexible)').screen.value).toBe('6.59')
    expect(more('Display: Super Retina XDR, 6.1-inch (diagonal) all-screen OLED').screen.value).toBe('6.1')
    expect(more('Screen: 6.78" AMOLED - 1080 x 2436').screen.value).toBe('6.78')
  })

  it('takes the full-rectangle size, not the rounded-corner one (Samsung)', () => {
    expect(more('Display size: 6.7" full rectangle (6.5" with rounded corners)').screen.value).toBe('6.7')
  })

  it('keeps the source site and leaves unstated fields null', () => {
    const m = extractMoreSpecs([{ content: 'Display: 6.67-inch AMOLED', source_url: 'https://www.po.co/global/x7-pro' }])
    expect(m.screen.source).toBe('po.co')
    expect(m.battery).toBeNull()
    expect(Object.keys(extractMoreSpecs([]))).toEqual(['battery', 'charging', 'chip', 'weight', 'water', 'screen'])
  })
})

