// Presentation helpers for the Specifications section (SpecManager.jsx).

/** Chunks saved from the same source link form one card, in the order the API returns
 * them (chunk order). Chunks without a link share one "No source link" card. */
export function groupSpecsBySource(specs) {
  const groups = new Map()
  for (const spec of specs) {
    const key = spec.source_url || ''
    if (!groups.has(key)) groups.set(key, { key, sourceUrl: spec.source_url || null, specs: [] })
    groups.get(key).specs.push(spec)
  }
  return [...groups.values()]
}

const FACT_LINE = /^([^:\n]{1,40}):\s+(.+)$/

/** Splits a chunk into blocks: "Label: value" lines become a two-column fact list,
 * anything else stays a paragraph. Presentation only; the stored text is unchanged. */
export function specBlocks(content) {
  const blocks = []
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const fact = line.match(FACT_LINE)
    const last = blocks[blocks.length - 1]
    if (fact) {
      const item = { label: fact[1].trim(), value: fact[2].trim() }
      if (last?.type === 'facts') last.items.push(item)
      else blocks.push({ type: 'facts', items: [item] })
    } else {
      blocks.push({ type: 'text', text: line })
    }
  }
  return blocks
}
