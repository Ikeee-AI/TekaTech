// Rows for the Compare page's face-off and table. Key-spec values come from the
// phones' saved, sourced spec text (utils/keySpecs.js); a gap stays a gap.

export const NOT_STATED = 'Not stated by source'

/** Largest number in a key-spec value ("128–512" → 512, "256 GB–1 TB" → 1024), for bar lengths. */
export function magnitude(found) {
  if (!found) return null
  if (typeof found.amount === 'number') return found.amount
  const parts = [...found.value.matchAll(/(\d+(?:\.\d+)?)\s*(TB)?/gi)].map((m) => Number(m[1]) * (m[2] ? 1024 : 1))
  return parts.length ? Math.max(...parts) : null
}

/**
 * One spec row. keySpecsList holds each phone's parsed specs
 * (undefined = still loading, null = couldn't load).
 * Options:
 *   key    — highlighted as one of the four key specs
 *   bars   — 'proportional' (numbers, longer = more) or 'full' (stated = full bar, no winner implied)
 *   higher — tag the single largest value "Higher" when every phone states it
 */
export function keyRow(id, label, keySpecsList, { key = false, bars = 'proportional', higher = false } = {}) {
  const cells = keySpecsList.map((k) => {
    if (k === undefined) return { text: '…', missing: true, n: null, source: null }
    const found = k?.[id]
    if (!found) return { text: NOT_STATED, missing: true, n: null, source: null }
    return {
      text: `${found.value}${found.unit ? ` ${found.unit}` : ''}`,
      missing: false,
      n: bars === 'proportional' ? magnitude(found) : null,
      source: [found.source, found.variants && 'base model'].filter(Boolean).join(' · ') || null,
    }
  })
  if (higher && cells.length >= 2 && cells.every((c) => !c.missing && c.n != null)) {
    const max = Math.max(...cells.map((c) => c.n))
    const top = cells.filter((c) => c.n === max)
    if (top.length === 1) top[0].higher = true
  }
  return { label, key, bars, cells }
}

export function plainRow(label, gadgets, get, { missingText = 'Not listed', source = 'catalog' } = {}) {
  return {
    label,
    cells: gadgets.map((g) => {
      const value = get(g)
      return value == null ? { text: missingText, missing: true, n: null, source: null } : { text: value, missing: false, n: null, source }
    }),
  }
}

/** Bar fill per cell: proportional where every phone states a number, full when stated, empty when not. */
export function barWidths(row) {
  const nums = row.cells.map((c) => c.n)
  const allNumeric = row.bars !== 'full' && nums.every((n) => n != null && n > 0)
  const max = allNumeric ? Math.max(...nums) : null
  return row.cells.map((c) => {
    if (c.missing) return 0
    return allNumeric ? Math.round((c.n / max) * 100) : 100
  })
}

/** The spec rows from parsed key specs ({...extractKeySpecs, ...extractMoreSpecs} per phone). */
export function specRows(keySpecsList) {
  return [
    keyRow('ram', 'RAM', keySpecsList, { key: true }),
    keyRow('storage', 'Storage', keySpecsList, { key: true }),
    keyRow('camera', 'Main camera', keySpecsList, { key: true }),
    keyRow('refresh', 'Display', keySpecsList, { key: true }),
    keyRow('battery', 'Battery', keySpecsList, { higher: true }),
    keyRow('charging', 'Charging', keySpecsList, { higher: true }),
    keyRow('chip', 'Chip', keySpecsList, { bars: 'full' }),
    // Lighter is usually better, so weight bars are full when stated: no "winner" implied.
    keyRow('weight', 'Weight', keySpecsList, { bars: 'full' }),
    keyRow('water', 'Water resistance', keySpecsList, { bars: 'full' }),
    keyRow('screen', 'Screen size', keySpecsList),
  ]
}

/** True when a row's bars mean something: every phone states a number and longer = more.
 * Rows that only say "stated" (chip, weight, water resistance) and catalog rows (price,
 * date, brand) show the value alone; a full bar on every side compared nothing. */
export function showsBars(row) {
  return row.bars === 'proportional' && row.cells.every((c) => c.n != null && c.n > 0)
}

/** Spec sections on the Compare page, in order. A row whose label is in none of them
 * goes to the last section, so a new row is never dropped. */
export const SPEC_GROUPS = [
  ['Key specs', ['RAM', 'Storage', 'Main camera', 'Display']],
  ['Battery & charging', ['Battery', 'Charging']],
  ['Design & hardware', ['Chip', 'Screen size', 'Weight', 'Water resistance']],
  ['Price & release', ['Price', 'Released', 'Brand']],
]

/** [{ title, rows }] in SPEC_GROUPS order, empty sections left out. */
export function groupRows(rows) {
  const groups = SPEC_GROUPS.map(([title, labels]) => ({ title, labels, rows: [] }))
  for (const row of rows) {
    const group = groups.find((g) => g.labels.includes(row.label)) ?? groups[groups.length - 1]
    group.rows.push(row)
  }
  return groups.filter((g) => g.rows.length).map(({ title, rows: groupRowsList }) => ({ title, rows: groupRowsList }))
}
