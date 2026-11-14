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

// All RAM/storage variants a source lists, for the phone page's "Variants" list.
// Pairs when the source pairs them ("8GB + 256GB; 12GB + 512GB"); otherwise separate RAM and
// storage options. Parenthetical extras ("up to 14GB dynamic RAM") are left out.
function variantsIn(text) {
  for (const segment of segments(text, { keepSemicolons: true })) {
    const { label, value } = labelled(segment)
    if (!(RAM_LABEL.test(label) && STORAGE_LABEL.test(label))) continue
    const pairs = [...value.matchAll(/(?<![\d.])(\d{1,2})[ \t]*GB[ \t]*\+[ \t]*(\d{1,4})[ \t]*(GB|TB)/gi)].map((p) => ({
      ram: Number(p[1]),
      storage: sizeInGb(Number(p[2]), p[3]),
    }))
    if (pairs.length) return { pairs, ram: pairs.map((p) => p.ram), storage: pairs.map((p) => p.storage) }
    const [ramPart, storagePart] = value.split(/\bwith\b/i)
    if (storagePart) return { pairs: [], ram: sizesIn(ramPart), storage: sizesIn(storagePart) }
  }
  const listed = (labelRe, otherRe) => {
    const sizes = []
    for (const segment of segments(text)) {
      const { label, value } = labelled(segment)
      if (!labelRe.test(label) || otherRe.test(label) || NOT_BASE.test(label)) continue
      sizes.push(...sizesIn(value.replace(/\([^)]*\)/g, '')))
    }
    return sizes
  }
  return { pairs: [], ram: listed(RAM_LABEL, STORAGE_LABEL), storage: listed(STORAGE_LABEL, RAM_LABEL) }
}

function uniqueSorted(list) {
  return [...new Set(list)].sort((a, b) => a - b)
}

export function formatGb(gb) {
  return formatSize(gb)
}

/**
 * The RAM/storage variants the saved sources list, or null when there is only one
 * (or none). { pairs: [{ ram, storage }], ram: [GB…], storage: [GB…], source }
 * pairs is empty when the source lists RAM and storage options separately.
 */
export function extractVariants(specs) {
  let found = null
  for (const spec of specs ?? []) {
    const v = variantsIn(spec?.content ?? '')
    if (!found && (v.pairs.length || v.ram.length || v.storage.length)) found = { ...v, source: sourceSite(spec.source_url) }
    else if (found && !found.pairs.length && !v.pairs.length) {
      // RAM on one page, storage on another: merge the option lists.
      if (!found.ram.length && v.ram.length) found.ram = v.ram
      if (!found.storage.length && v.storage.length) found.storage = v.storage
    }
  }
  if (!found) return null
  const pairs = [...new Map(found.pairs.map((p) => [`${p.ram}+${p.storage}`, p])).values()].sort(
    (a, b) => a.storage - b.storage || a.ram - b.ram,
  )
  const result = { pairs, ram: uniqueSorted(found.ram), storage: uniqueSorted(found.storage), source: found.source }
  const many = pairs.length > 1 || result.ram.length > 1 || result.storage.length > 1
  return many ? result : null
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

// More key specs for the phone page, compare rows and catalog filters (owner decision,
// 14 Nov 2026): battery, wired charging, chip, weight, water resistance, screen size.
// Same rules as the four tiles: only what the source states, the base/first variant,
// the source site kept, null otherwise. `amount` is the number behind a numeric value,
// for bars, sorting and filters.
export const MORE_SPECS = [
  { id: 'battery', label: 'Battery' },
  { id: 'charging', label: 'Charging' },
  { id: 'chip', label: 'Chip' },
  { id: 'weight', label: 'Weight' },
  { id: 'water', label: 'Water resistance' },
  { id: 'screen', label: 'Screen size' },
]

function trimDecimal(n) {
  return String(Number(n.toFixed(2)))
}

const MAH = /(?<![\d.,])(\d{1,2},?\d{3})[ \t]*mAh\b/i

// "Battery: 5450mAh/21.37Wh (rated); 5600mAh/21.96Wh (typical)" → 5600: the typical capacity
// when the line names one, otherwise the first capacity that isn't the rated/minimum one.
function batteryIn(value) {
  // ", " splits clauses but keeps "4,000mAh" whole.
  const clauses = value.split(/;|,(?=\s)/).filter((c) => MAH.test(c))
  const pick = clauses.find((c) => /\btyp/i.test(c)) ?? clauses.find((c) => !/\b(?:rated|min)/i.test(c)) ?? clauses[0]
  return pick ? Number(pick.match(MAH)[1].replace(',', '')) : null
}

// Labels that describe something other than the phone's own wired charging power.
const NOT_WIRED = /wireless|magsafe|\bqi|protocol|port|connector|reverse|time/i

const MORE_PARSERS = {
  battery(text) {
    for (const { label, value } of segments(text, { keepSemicolons: true }).map(labelled)) {
      if (!/battery/i.test(label) || /type|removable/i.test(label)) continue
      const mah = batteryIn(value)
      if (mah) return { value: String(mah), unit: 'mAh', amount: mah }
    }
    // An unlabelled sentence: "4000mAh battery".
    const m = text.match(/(?<![\d.,])(\d{1,2},?\d{3})[ \t]*mAh[ \t]+battery\b/i)
    if (m) {
      const mah = Number(m[1].replace(',', ''))
      return { value: String(mah), unit: 'mAh', amount: mah }
    }
    return null
  },
  charging(text) {
    // Wired only, the highest power the line states ("45W SUPERVOOC, 33W SUPERVOOC" → 45).
    // A minimum adapter ("with a 20W adapter or higher") is not the phone's charging power.
    // segments() splits on ";", so "; wireless 50W AIRVOOC" becomes an unlabelled part and is skipped.
    for (const { label, value } of segments(text).map(labelled)) {
      if (!/charg/i.test(label) || NOT_WIRED.test(label) || /or higher/i.test(value)) continue
      const wired = value.split(/\bwireless\b/i)[0]
      const watts = [...wired.matchAll(/(?<![\d.])(\d{1,3})[ \t]*W\b/g)].map((m) => Number(m[1])).filter((w) => w >= 5)
      if (watts.length) {
        const max = Math.max(...watts)
        return { value: String(max), unit: 'W', amount: max }
      }
    }
    return null
  },
  chip(text) {
    for (const { label, value } of segments(text).map(labelled)) {
      if (!/^\s*(?:chip|chipset|soc|processor|platform)\b/i.test(label)) continue
      const name = value
        .split(/[(,]/)[0]
        .replace(/\s+\d+(?:\.\d+)?\s*GHz.*$/i, '')
        .replace(/\s+(?:mobile platform|chip|processor)\s*\.?\s*$/i, '')
        .replace(/[.\s]+$/, '')
        .trim()
      if (/[a-z]/i.test(name) && /\d|bionic|elite/i.test(name)) return { value: name, unit: '' }
    }
    // An unlabelled Apple sentence: "A16 Bionic chip."
    const m = text.match(/\b(A\d{2}(?: Bionic| Pro)?) chip\b/)
    return m ? { value: m[1], unit: '' } : null
  },
  weight(text) {
    for (const { label, value } of segments(text).map(labelled)) {
      if (!/^\s*weight\b/i.test(label)) continue
      // The first weight listed is the base/first finish ("185.5 g (leather); 190 g (glass)").
      const m = value.match(/(?<![\d.])(\d{2,4}(?:\.\d{1,2})?)[ \t]*(?:g|grams)\b/i)
      if (m) return { value: trimDecimal(Number(m[1])), unit: 'g', amount: Number(m[1]) }
    }
    return null
  },
  water(text) {
    // Every IP code the text states, e.g. "IP69, IP68, IP66 rated" → IP66 / IP68 / IP69.
    const codes = [...new Set([...text.matchAll(/\bIP([0-6X])([0-9])\b/gi)].map((m) => `IP${m[1].toUpperCase()}${m[2]}`))].sort()
    if (codes.length === 0) return null
    return { value: codes.join(' / '), unit: '', codes }
  },
  screen(text) {
    // The display's diagonal: the first inch size on a display/screen line
    // ("6.7" full rectangle (6.5" with rounded corners)" → 6.7).
    const size = /(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)[ \t]*(?:-?[ \t]*inch(?:es)?\b|["”″])/i
    for (const segment of segments(text)) {
      const { label } = labelled(segment)
      if (!/display|screen/i.test(label || segment) || /to-body|ratio|protect|glass/i.test(label)) continue
      const m = segment.match(size)
      if (m && Number(m[1]) >= 3 && Number(m[1]) <= 20) return { value: trimDecimal(Number(m[1])), unit: 'in', amount: Number(m[1]) }
    }
    return null
  },
}

/** True when a stated IP rating means water resistant to IP67 or better (IP67, IP68, IP69, IPX7…). */
export function isWaterResistant(water) {
  return Boolean(water?.codes?.some((code) => Number(code.slice(-1)) >= 7))
}

/**
 * specs: the gadget's saved spec chunks ({ content, source_url }).
 * Returns { battery, charging, chip, weight, water, screen }, each
 * { value, unit, source, amount? } or null when no saved source states it.
 */
export function extractMoreSpecs(specs) {
  const result = Object.fromEntries(MORE_SPECS.map((s) => [s.id, null]))
  for (const spec of specs ?? []) {
    const text = spec?.content ?? ''
    for (const id of Object.keys(MORE_PARSERS)) {
      if (result[id]) continue
      const found = MORE_PARSERS[id](text)
      if (found) result[id] = { ...found, source: sourceSite(spec.source_url) }
    }
  }
  return result
}
