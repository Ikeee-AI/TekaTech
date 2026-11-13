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

const PARSERS = {
  ram(text) {
    const m =
      text.match(/(\d{1,2})\s*GB\s*(?:of\s+)?(?:RAM|memory)\b/i) ??
      text.match(/\b(?:RAM|memory)\s*[:-]?\s*(\d{1,2})\s*GB/i)
    return m ? { value: m[1], unit: 'GB' } : null
  },
  storage(text) {
    const m = text.match(/\b(?:internal\s+)?storage(?:\s+(?:variants|options|capacity))?[^.\n:]*?[:-]?\s*((?:\d{1,4}\s*(?:GB|TB)[\s,/and&]*)+)/i)
    if (!m) return null
    const sizes = [...m[1].matchAll(/(\d{1,4})\s*(GB|TB)/gi)].map((s) => sizeInGb(Number(s[1]), s[2]))
    if (sizes.length === 0) return null
    const low = Math.min(...sizes)
    const high = Math.max(...sizes)
    if (high < 1024) return { value: low === high ? `${low}` : `${low}–${high}`, unit: 'GB' }
    return { value: low === high ? formatSize(low) : `${formatSize(low)}–${formatSize(high)}`, unit: '' }
  },
  camera(text) {
    const m =
      text.match(/(\d{1,3}(?:\.\d)?)\s*MP\s*(?:\(?[^)]*\)?\s*)?main\b/i) ??
      text.match(/\bmain(?:\s+camera)?\s*[:-]?\s*(\d{1,3}(?:\.\d)?)\s*MP/i) ??
      text.match(/\brear\s+cameras?\s*[:-]?\s*(\d{1,3}(?:\.\d)?)\s*MP/i)
    return m ? { value: m[1], unit: 'MP' } : null
  },
  refresh(text) {
    const m = text.match(/(\d{2,3})\s*Hz\b/i)
    return m ? { value: m[1], unit: 'Hz' } : null
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
