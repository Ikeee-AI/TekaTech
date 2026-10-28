import { describe, expect, it } from 'vitest'
import { MAX_DIFF_CELLS, diffWords } from './wordDiff'

const join = (segments) => segments.map((s) => s.text).join('')
const changed = (segments) => segments.filter((s) => s.changed).map((s) => s.text)

describe('diffWords', () => {
  it('marks a replaced value as removed before and added after', () => {
    const d = diffWords('Battery: 4500 mAh', 'Battery: 4700 mAh')
    expect(changed(d.before)).toEqual(['4500'])
    expect(changed(d.after)).toEqual(['4700'])
    expect(d.identical).toBe(false)
    expect(d.coarse).toBe(false)
  })

  it('rebuilds both original texts exactly, whitespace and newlines included', () => {
    const before = '  Screen: 6.1 in\nWeight: 187 g  '
    const after = 'Screen: 6.3 in OLED\n\nWeight: 187 g'
    const d = diffWords(before, after)
    expect(join(d.before)).toBe(before)
    expect(join(d.after)).toBe(after)
  })

  it('reports an insertion only on the after side', () => {
    const d = diffWords('Wi-Fi 6', 'Wi-Fi 6E and Bluetooth 5.3')
    expect(changed(d.before)).toEqual(['6'])
    expect(changed(d.after)).toEqual(['6E and Bluetooth 5.3'])
  })

  it('reports a deletion only on the before side', () => {
    const d = diffWords('Colors: black, white, blue', 'Colors: black, blue')
    expect(changed(d.before)).toEqual(['white,'])
    expect(changed(d.after)).toEqual([])
  })

  it('keeps the space before a changed run outside the marked text', () => {
    const d = diffWords('a b c', 'a x y c')
    expect(d.after).toEqual([
      { text: 'a ', changed: false },
      { text: 'x y', changed: true },
      { text: ' c', changed: false },
    ])
  })

  it('does not count whitespace-only changes', () => {
    const d = diffWords('one two\nthree', 'one   two three')
    expect(d.identical).toBe(true)
    expect(changed(d.before)).toEqual([])
    expect(changed(d.after)).toEqual([])
  })

  it('treats case and punctuation as real changes', () => {
    const d = diffWords('USB-C port.', 'usb-c port')
    expect(changed(d.before)).toEqual(['USB-C port.'])
  })

  it('handles empty and missing texts', () => {
    expect(diffWords('', '')).toEqual({ before: [], after: [], identical: true, coarse: false })
    const d = diffWords(null, 'New spec')
    expect(d.before).toEqual([])
    expect(changed(d.after)).toEqual(['New spec'])
    expect(changed(diffWords('Old spec', undefined).before)).toEqual(['Old spec'])
  })

  it('finds a minimal diff across a reordered middle', () => {
    const d = diffWords('a b c d e', 'a c b d e')
    // One of b/c must move; the rest is common.
    expect(changed(d.before)).toHaveLength(1)
    expect(changed(d.after)).toHaveLength(1)
  })

  it('falls back to one block per side for very different, very long texts', () => {
    const size = Math.ceil(Math.sqrt(MAX_DIFF_CELLS)) + 10
    const before = Array.from({ length: size }, (_, i) => `old${i}`).join(' ')
    const after = Array.from({ length: size }, (_, i) => `new${i}`).join(' ')
    const started = performance.now()
    const d = diffWords(`Head ${before} Tail`, `Head ${after} Tail`)
    expect(performance.now() - started).toBeLessThan(500)
    expect(d.coarse).toBe(true)
    expect(changed(d.before)).toEqual([before])
    expect(changed(d.after)).toEqual([after])
  })

  it('still diffs word by word when a long text has a small change', () => {
    const words = Array.from({ length: 3000 }, (_, i) => `w${i}`)
    const edited = [...words]
    edited[1500] = 'CHANGED'
    const d = diffWords(words.join(' '), edited.join(' '))
    expect(d.coarse).toBe(false)
    expect(changed(d.before)).toEqual(['w1500'])
    expect(changed(d.after)).toEqual(['CHANGED'])
  })
})
