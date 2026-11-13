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
    expect(k.storage).toMatchObject({ value: '128–512', unit: 'GB' })
    expect(countKeySpecs(k)).toBe(4)
  })

  it('reads Apple-style lines', () => {
    const k = extractKeySpecs([
      { content: 'Storage: 128GB, 256GB, 512GB', source_url: 'https://support.apple.com/en-ph/111831' },
      { content: 'Rear camera: 48MP Main, 26 mm, f/1.6', source_url: 'https://support.apple.com/en-ph/111831' },
    ])
    expect(k.storage).toEqual({ value: '128–512', unit: 'GB', source: 'support.apple.com' })
    expect(k.camera.value).toBe('48')
    expect(k.ram).toBeNull()
    expect(k.refresh).toBeNull()
  })

  it('shows terabytes and leaves unstated specs null', () => {
    const k = extractKeySpecs([{ content: 'Storage options: 256GB, 512GB, 1TB', source_url: null }])
    expect(k.storage).toEqual({ value: '256 GB–1 TB', unit: '', source: null })
    expect(countKeySpecs(extractKeySpecs([]))).toBe(0)
  })

  it('does not take battery or other numbers for RAM', () => {
    const k = extractKeySpecs([{ content: '4000mAh battery; up to 29 hours video playback.' }])
    expect(countKeySpecs(k)).toBe(0)
  })
})
