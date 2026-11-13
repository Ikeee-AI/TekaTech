import { describe, expect, it } from 'vitest'
import { countKeySpecs, extractKeySpecs } from './keySpecs'

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
