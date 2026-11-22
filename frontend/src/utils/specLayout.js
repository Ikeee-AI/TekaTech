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

/** The phone page groups spec facts under these headings, in this order. */
export const SPEC_SECTIONS = ['Display', 'Performance', 'Battery & charging', 'Camera', 'Build & durability', 'Connectivity', 'General']

// Checked in this order, first match wins: "Front camera" is a camera, "USB charging" is
// charging, "Display protection" is the display. Labels are matched, never values.
// Playback times are battery life, checked before Camera so "Video playback" is not a camera
// spec (22 Nov 2026, seen on the iPhone 16 sheet).
const SECTION_RULES = [
  ['Battery & charging', /playback|battery life|screen-on|standby/],
  ['Camera', /camera|selfie|video|lens|zoom|aperture|telephoto|ultra-?wide|macro|flash|megapixel|\bois\b/],
  ['Battery & charging', /batter|charg|\bmah\b|power/],
  ['Display', /display|screen|resolution|refresh|brightness|contrast|\bppi\b|pixel density|\bhdr\b|panel|touch sampling/],
  ['Connectivity', /wi-?fi|bluetooth|\bnfc\b|\busb\b|\b[2345]g\b|network|\bsim\b|gps|positioning|navigation|infrared|\bir\b|radio|headphone|audio jack|\bport\b|connectivity|band|\besim\b|\blte\b/],
  ['Performance', /chip|cpu|processor|\bsoc\b|gpu|\bram\b|memory|storage|\brom\b|internal|\bos\b|android|software|platform|antutu|performance|card slot|operating system|update/],
  ['Build & durability', /build|dimension|weight|size|body|frame|\bback\b|glass|gorilla|\bip\s?\d|\bip rating|water|dust|durab|material|colou?r|finish|thickness|drop|protection|\bmil-?std/],
]

/** Which SPEC_SECTIONS heading a fact label belongs to ("General" when nothing matches). */
export function specSection(label) {
  const text = (label ?? '').toLowerCase()
  for (const [section, pattern] of SECTION_RULES) if (pattern.test(text)) return section
  return 'General'
}

/**
 * A chunk as sections for the phone page: "Label: value" lines grouped under their section
 * in SPEC_SECTIONS order, and every unlabelled line kept as raw text after them.
 * Returns { sections: [{ title, items }], text: [line] }. Presentation only.
 */
export function specSections(content) {
  const bySection = new Map()
  const text = []
  for (const block of specBlocks(content ?? '')) {
    if (block.type === 'text') {
      text.push(block.text)
      continue
    }
    for (const item of block.items) {
      const title = specSection(item.label)
      if (!bySection.has(title)) bySection.set(title, [])
      bySection.get(title).push(item)
    }
  }
  const sections = SPEC_SECTIONS.filter((title) => bySection.has(title)).map((title) => ({ title, items: bySection.get(title) }))
  return { sections, text }
}

/**
 * Every saved chunk of a phone as ONE sheet, so a heading appears once however many parts
 * the specs were saved in: { sections: [{ title, items: [{ label, value, spec }] }],
 * notes: [{ text, spec }] }. Each item keeps the chunk it came from (`spec`), so a
 * correction still goes to the right part. Order: SPEC_SECTIONS, then the chunks' order.
 */
export function mergedSheet(specs) {
  const bySection = new Map()
  const notes = []
  for (const spec of specs ?? []) {
    const { sections, text } = specSections(spec.content)
    for (const section of sections) {
      if (!bySection.has(section.title)) bySection.set(section.title, [])
      bySection.get(section.title).push(...section.items.map((item) => ({ ...item, spec })))
    }
    for (const line of text) notes.push({ text: line, spec })
  }
  return {
    sections: SPEC_SECTIONS.filter((title) => bySection.has(title)).map((title) => ({ title, items: bySection.get(title) })),
    notes,
  }
}

// Phone page top card: a few details the tiles don't show, word for word from the source.
// First matching label wins; a phone shows only the ones its source states.
const HIGHLIGHT_RULES = [
  ['Display', /^(display|display type|screen|main display)$/],
  ['Battery life', /playback|battery life|screen-on/],
  ['Front camera', /front camera|selfie/],
  ['Video', /^video( recording)?$/],
  ['Software', /operating system|^os$|software|android/],
]

/** Up to `max` { title, label, value, source } facts for the phone page's Highlights list. */
export function specHighlights(specs, max = 4) {
  const facts = []
  for (const spec of specs ?? []) {
    for (const block of specBlocks(spec.content ?? '')) {
      if (block.type === 'facts') for (const item of block.items) facts.push({ ...item, spec })
    }
  }
  const picked = []
  for (const [title, pattern] of HIGHLIGHT_RULES) {
    const fact = facts.find((f) => pattern.test(f.label.toLowerCase()))
    if (fact) picked.push({ title, label: fact.label, value: fact.value, sourceUrl: fact.spec.source_url || null })
    if (picked.length === max) break
  }
  return picked
}
