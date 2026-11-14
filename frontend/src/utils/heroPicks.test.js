// The catalog hero only features phones that fill at least 3 of the 4 key-spec tiles
// (14 Nov 2026), falling back to any phone with saved specs.
import { describe, expect, it } from 'vitest'
import { heroCandidates } from './heroPicks'

const chunk = (content) => [{ content, source_url: 'https://example.com/spec' }]
const FULL = 'RAM: 8 GB\nStorage: 256 GB\nMain camera: 50 MP\nDisplay: 6.7-inch AMOLED, 120Hz'
const THREE = 'RAM: 8 GB\nStorage: 256 GB\nMain camera: 50 MP'
const ONE = 'RAM: 8 GB'

describe('heroCandidates', () => {
  it('keeps phones with 3 or 4 key specs and drops the rest, in order', () => {
    const specsById = { a: chunk(ONE), b: chunk(FULL), c: chunk(THREE), d: [] }
    expect(heroCandidates(['a', 'b', 'c', 'd'], specsById)).toEqual(['b', 'c'])
  })

  it('falls back to any phone with specs when none has 3 key specs', () => {
    const specsById = { a: chunk(ONE), b: [], c: chunk('Battery: 5000 mAh') }
    expect(heroCandidates(['a', 'b', 'c'], specsById)).toEqual(['a', 'c'])
  })

  it('is empty when no phone has specs', () => {
    expect(heroCandidates(['a'], { a: [] })).toEqual([])
    expect(heroCandidates(['a'], null)).toEqual([])
  })
})
