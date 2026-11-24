// Shared by the phone page's benchmarks section and the compare page's benchmark bars.
export function formatBenchmarkValue(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

// One key per comparable result: same kind, test, settings and unit (case-insensitive).
export function benchmarkKey(row) {
  return [row.kind, row.test, row.settings ?? '', row.unit].map((v) => String(v).trim().toLowerCase()).join('|')
}

/**
 * Rows for the compare page: results that at least two of the compared phones share, each with
 * every phone's value (null where a phone has none), games first. Higher is better for every
 * kind stored (fps and benchmark points).
 */
export function sharedBenchmarks(rowsByGadget, gadgetIds) {
  const groups = new Map()
  for (const gid of gadgetIds) {
    for (const row of rowsByGadget[gid] ?? []) {
      const key = benchmarkKey(row)
      if (!groups.has(key)) groups.set(key, { key, kind: row.kind, test: row.test, settings: row.settings, unit: row.unit, values: {} })
      const g = groups.get(key)
      // Two rows for the same test on one phone: keep the newer check.
      const prev = g.values[gid]
      if (!prev || String(row.checked_at) > String(prev.checked_at)) g.values[gid] = row
    }
  }
  return [...groups.values()]
    .filter((g) => Object.keys(g.values).length >= 2)
    .sort((a, b) => (a.kind === b.kind ? a.test.localeCompare(b.test) : a.kind === 'game' ? -1 : 1))
}

/** Admin web drafts: spec lines grouped by page, so each page is saved once with its own link. */
export function groupSpecDrafts(drafts) {
  const byUrl = new Map()
  for (const d of drafts) {
    if (!byUrl.has(d.source_url)) byUrl.set(d.source_url, [])
    byUrl.get(d.source_url).push(d.text)
  }
  return [...byUrl.entries()].map(([source_url, lines]) => ({ source_url, raw_text: lines.join('\n') }))
}
