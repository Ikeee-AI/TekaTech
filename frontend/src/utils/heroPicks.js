import { countKeySpecs, extractKeySpecs } from './keySpecs'

// A featured phone should fill its key-spec tiles: at least this many of the four.
export const HERO_MIN_KEY_SPECS = 3

/**
 * Ids of the phones the catalog hero may feature (14 Nov 2026): phones whose saved specs
 * state at least 3 of the 4 key specs. If none do, any phone with saved specs, so the hero
 * still shows something. Order is kept; the caller shuffles.
 */
export function heroCandidates(ids, specsById) {
  const withSpecs = ids.filter((id) => specsById?.[id]?.length > 0)
  const full = withSpecs.filter((id) => countKeySpecs(extractKeySpecs(specsById[id])) >= HERO_MIN_KEY_SPECS)
  return full.length > 0 ? full : withSpecs
}
