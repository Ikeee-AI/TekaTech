import { describe, expect, it } from 'vitest'
import { barWidths, specRows } from './compareRows'
import { extractKeySpecs, extractMoreSpecs } from './keySpecs'

const parsed = (content, source_url = null) => {
  const specs = [{ content, source_url }]
  return { ...extractKeySpecs(specs), ...extractMoreSpecs(specs) }
}

const vivo = parsed(
  'Battery: 6000 mAh (TYP)\nCharging power: 90W\nProcessor: Snapdragon 7 Gen3\nWeight: 189 g (Black); 199 g (Purple, Red)\nIngress protection: IP68; IP69\nDisplay size: 6.77"',
  'https://www.vivo.com/ph/products/param/v50',
)
const samsung = parsed(
  'Battery capacity: 4,000mAh\nChipset: Snapdragon 8 Elite\nDisplay size: 6.2" full rectangle (6" with rounded corners)\nWeight: 162 g\nWater resistance: IP68',
  'https://www.samsung.com/ph/smartphones/galaxy-s25/specs/',
)

const row = (rows, label) => rows.find((r) => r.label === label)

describe('compare spec rows', () => {
  it('keeps the four key rows first and adds the six more-spec rows', () => {
    expect(specRows([vivo, samsung]).map((r) => r.label)).toEqual([
      'RAM',
      'Storage',
      'Main camera',
      'Display',
      'Battery',
      'Charging',
      'Chip',
      'Weight',
      'Water resistance',
      'Screen size',
    ])
  })

  it('shows each value with its source, and "Not stated by source" for a gap', () => {
    const rows = specRows([vivo, samsung])
    expect(row(rows, 'Battery').cells.map((c) => c.text)).toEqual(['6000 mAh', '4000 mAh'])
    expect(row(rows, 'Battery').cells[0].source).toBe('vivo.com')
    expect(row(rows, 'Charging').cells[1]).toMatchObject({ text: 'Not stated by source', missing: true })
    expect(row(rows, 'Water resistance').cells[0].text).toBe('IP68 / IP69')
  })

  it('makes battery and screen bars proportional', () => {
    const rows = specRows([vivo, samsung])
    expect(barWidths(row(rows, 'Battery'))).toEqual([100, 67])
    expect(barWidths(row(rows, 'Screen size'))).toEqual([100, 92])
  })

  it('gives weight, chip and water full bars when stated, so no winner is implied', () => {
    const rows = specRows([vivo, samsung])
    expect(barWidths(row(rows, 'Weight'))).toEqual([100, 100])
    expect(barWidths(row(rows, 'Chip'))).toEqual([100, 100])
    expect(barWidths(row(rows, 'Charging'))).toEqual([100, 0])
  })

  it('tags the larger battery as "Higher" only when every phone states it', () => {
    const rows = specRows([vivo, samsung])
    expect(row(rows, 'Battery').cells.map((c) => Boolean(c.higher))).toEqual([true, false])
    // Samsung's source doesn't state charging: no tag at all.
    expect(row(rows, 'Charging').cells.some((c) => c.higher)).toBe(false)
    // Never on weight, even though the numbers differ.
    expect(row(rows, 'Weight').cells.some((c) => c.higher)).toBe(false)
  })

  it('does not tag a tie', () => {
    const rows = specRows([vivo, parsed('Battery: 6000mAh (typical)')])
    expect(row(rows, 'Battery').cells.some((c) => c.higher)).toBe(false)
  })

  it('shows loading and failed phones as gaps', () => {
    const rows = specRows([undefined, null])
    expect(row(rows, 'Battery').cells.map((c) => c.text)).toEqual(['…', 'Not stated by source'])
  })
})
