// The four key specs shown as tiles for every phone (owner decision, 13 Nov 2026: scope is
// smartphones, so the same four everywhere): RAM, storage, main camera, display refresh rate.
//
// They are read from the phone's saved, sourced spec text, never guessed. A value the text
// doesn't state stays null and the tile says "Not stated by source". When the backend gains
// structured key-spec fields, this parser can be swapped for them without touching the tiles.

export const KEY_SPECS = [
  { id: 'ram', label: 'RAM' },
  { id: 'storage', label: 'Storage' },
  { id: 'camera', label: 'Main camera' },
  { id: 'refresh', label: 'Display' },
]

function sourceSite(url) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function sizeInGb(amount, unit) {
  return unit.toUpperCase() === 'TB' ? amount * 1024 : amount
}

function formatSize(gb) {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`
}

// Phones sold in several variants show the standard (base) model only, e.g. 8 GB / 256 GB
// (owner, 13 Nov 2026); `variants` lets the tile say "base model".
function sizeValue(gb, variants = false) {
  const value = gb >= 1024 ? { value: formatSize(gb), unit: '' } : { value: `${gb}`, unit: 'GB' }
  return variants ? { ...value, variants: true } : value
}

function baseSize(sizes) {
  if (!sizes || sizes.length === 0) return null
  return sizeValue(Math.min(...sizes), new Set(sizes).size > 1)
}

// Sizes listed in one segment: "128GB, 256GB, 512GB", "8GB / 12GB", "256GB and 1TB".
// (?<!\d) stops "256GB" from being read as "56GB".
function sizesIn(list) {
  return [...list.matchAll(/(?<![\d.])(\d{1,4})[ \t]*(GB|TB)\b/gi)].map((s) => sizeInGb(Number(s[1]), s[2]))
}

// Spec text is a list of "Label: value" lines; some pages pack several on one line
// ("Memory: 8 GB · Internal storage: 128 GB") or use bullets and semicolons.
// keepSemicolons: combined lines list variants with them ("8GB + 256GB; 12GB + 512GB").
function segments(text, { keepSemicolons = false } = {}) {
  return text
    .split(keepSemicolons ? /\n|·|•/ : /\n|·|•|;/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function labelled(segment) {
  const i = segment.indexOf(':')
  return i === -1 ? { label: '', value: segment } : { label: segment.slice(0, i), value: segment.slice(i + 1) }
}

const RAM_LABEL = /\b(?:RAM|memory)\b/i
const STORAGE_LABEL = /\b(?:storage|ROM)\b/i
// Labels that name extras rather than the phone's own RAM or storage.
const NOT_BASE = /expand|virtual|extended|dynamic|type|card|cloud/i

// One segment for both, as OPPO, vivo and POCO pages write it:
// "RAM and storage: 12GB + 256GB", "RAM + ROM: 8GB + 256GB / 12GB + 512GB",
// "RAM & Storage: 8GB or 12GB LPDDR5X RAM with 256GB or 512GB UFS 4.0 storage".
function combinedVariants(text) {
  for (const segment of segments(text, { keepSemicolons: true })) {
    const { label, value } = labelled(segment)
    if (!(RAM_LABEL.test(label) && STORAGE_LABEL.test(label))) continue
    const pairs = [...value.matchAll(/(?<![\d.])(\d{1,2})[ \t]*GB[ \t]*\+[ \t]*(\d{1,4})[ \t]*(GB|TB)/gi)]
    if (pairs.length > 0) {
      // The base variant is the pair with the least storage, then the least RAM ("8GB + 256GB").
      const variants = pairs
        .map((p) => ({ ram: Number(p[1]), storage: sizeInGb(Number(p[2]), p[3]) }))
        .sort((a, b) => a.storage - b.storage || a.ram - b.ram)
      const many = variants.length > 1
      return { ram: sizeValue(variants[0].ram, many), storage: sizeValue(variants[0].storage, many) }
    }
    const [ramPart, storagePart] = value.split(/\bwith\b/i)
    if (storagePart) {
      const ram = sizesIn(ramPart)
      const storage = sizesIn(storagePart)
      if (ram.length && storage.length) return { ram: baseSize(ram), storage: baseSize(storage) }
    }
  }
  return null
}

// Sizes from every segment labelled like `labelRe` (e.g. two editions: "Memory (Edition): 24GB",
// "Memory (Pro): 16GB" → base 16), skipping combined and "extra" labels.
function labelledSizes(text, labelRe, otherRe, firstOnly) {
  const sizes = []
  for (const segment of segments(text)) {
    const { label, value } = labelled(segment)
    if (!labelRe.test(label) || otherRe.test(label) || NOT_BASE.test(label)) continue
    const found = sizesIn(value)
    if (found.length) sizes.push(...(firstOnly ? found.slice(0, 1) : found))
  }
  return sizes
}

function trimNumber(value) {
  return value.replace(/\.0$/, '')
}

const PARSERS = {
  ram(text) {
    const combined = combinedVariants(text)
    if (combined) return combined.ram
    const before = text.match(/(?<![\d.])(\d{1,2})[ \t]*GB[ \t]*(?:of[ \t]+)?(?:RAM|memory)\b/i)
    if (before) return { value: before[1], unit: 'GB' }
    // First size per line: "RAM: 12GB (up to 14GB dynamic RAM expansion)" is 12 GB.
    return baseSize(labelledSizes(text, RAM_LABEL, STORAGE_LABEL, true))
  },
  storage(text) {
    const combined = combinedVariants(text)
    if (combined) return combined.storage
    return baseSize(labelledSizes(text, STORAGE_LABEL, RAM_LABEL, false))
  },
  camera(text) {
    const m =
      text.match(/(\d{1,3}(?:\.\d)?)\s*MP\s*(?:\(?[^)]*\)?\s*)?main\b/i) ??
      text.match(/\bmain(?:\s+(?:rear\s+)?camera)?\s*[:-]?\s*(\d{1,3}(?:\.\d)?)\s*MP/i) ??
      text.match(/\brear\s+cameras?\s*[:-]?\s*(\d{1,3}(?:\.\d)?)\s*MP/i) ??
      text.match(/\brear[ \t]+(\d{1,3}(?:\.\d)?)[ \t]*MP/i)
    return m ? { value: trimNumber(m[1]), unit: 'MP' } : null
  },
  refresh(text) {
    // The "refresh rate" segment first, taking its highest rate ("LTPO adaptive (120/90/72/60 Hz)" → 120).
    for (const segment of segments(text)) {
      if (!/refresh/i.test(segment)) continue
      const rates = [...segment.matchAll(/(?<![\d.])(\d{2,3})(?![\d.])/g)].map((m) => Number(m[1])).filter((n) => n >= 30 && n <= 240)
      if (rates.length) return { value: String(Math.max(...rates)), unit: 'Hz' }
    }
    // Otherwise a display rate, never PWM dimming or touch sampling ("PWM dimming: 3840Hz").
    for (const segment of segments(text)) {
      if (/PWM|dimming|touch|sampling|charg|audio/i.test(segment)) continue
      const m = segment.match(/(?<![\d.])(\d{2,3})[ \t]*Hz\b/i)
      if (m && Number(m[1]) <= 240) return { value: m[1], unit: 'Hz' }
    }
    return null
  },
}

/**
 * specs: the gadget's saved spec chunks ({ content, source_url }).
 * Returns { ram, storage, camera, refresh }, each { value, unit, source } or null.
 */
export function extractKeySpecs(specs) {
  const result = { ram: null, storage: null, camera: null, refresh: null }
  for (const spec of specs ?? []) {
    const text = spec?.content ?? ''
    for (const id of Object.keys(PARSERS)) {
      if (result[id]) continue
      const found = PARSERS[id](text)
      if (found) result[id] = { ...found, source: sourceSite(spec.source_url) }
    }
  }
  return result
}

export function countKeySpecs(keySpecs) {
  return Object.values(keySpecs ?? {}).filter(Boolean).length
}
