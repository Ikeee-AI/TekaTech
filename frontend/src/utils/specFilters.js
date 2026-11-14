// Catalog filters and sorts on the specs read from each phone's saved sources
// (extractMoreSpecs). A phone whose source doesn't state a filtered spec is excluded
// from that filter, and counted so the catalog can say why it is hidden.
import { isWaterResistant } from './keySpecs'

export const BATTERY_OPTIONS = [4000, 5000, 6000]
export const CHARGING_OPTIONS = [30, 45, 65, 80]

export const SPEC_SORTS = {
  battery: { field: 'battery', direction: -1 },
  charging: { field: 'charging', direction: -1 },
  weight: { field: 'weight', direction: 1 },
}

const FIELD_NAMES = { battery: 'battery', charging: 'charging power', water: 'an IP rating' }

/**
 * gadgets: the list after search/brand/price filters.
 * moreById: { [gadgetId]: extractMoreSpecs(...) }; a gadget missing from it has no loaded specs.
 * filters: { minBattery, minCharging, waterResistant } (null/false = off).
 * Returns { list, unstated: { count, fields }, unchecked } where unstated counts phones hidden
 * only because their source doesn't state a filtered spec, and unchecked those whose specs
 * couldn't be loaded.
 */
export function applySpecFilters(gadgets, moreById, { minBattery = null, minCharging = null, waterResistant = false } = {}) {
  const active = minBattery != null || minCharging != null || waterResistant
  if (!active) return { list: gadgets, unstated: { count: 0, fields: [] }, unchecked: 0 }
  const fields = new Set()
  let unstatedCount = 0
  let unchecked = 0
  const list = gadgets.filter((g) => {
    const more = moreById?.[g.id]
    if (!more) {
      unchecked += 1
      return false
    }
    const missing = []
    if (minBattery != null && !more.battery) missing.push('battery')
    if (minCharging != null && !more.charging) missing.push('charging')
    if (waterResistant && !more.water) missing.push('water')
    if (missing.length) {
      unstatedCount += 1
      missing.forEach((f) => fields.add(f))
      return false
    }
    if (minBattery != null && more.battery.amount < minBattery) return false
    if (minCharging != null && more.charging.amount < minCharging) return false
    if (waterResistant && !isWaterResistant(more.water)) return false
    return true
  })
  const order = ['battery', 'charging', 'water']
  return { list, unstated: { count: unstatedCount, fields: order.filter((f) => fields.has(f)) }, unchecked }
}

/** "3 phones hidden: their sources don't state battery or charging power", or null. */
export function hiddenNote({ unstated, unchecked }) {
  const parts = []
  if (unstated.count > 0) {
    const n = unstated.count
    const names = unstated.fields.map((f) => FIELD_NAMES[f]).join(' or ')
    parts.push(`${n} ${n === 1 ? 'phone' : 'phones'} hidden: ${n === 1 ? 'its source doesn’t' : 'their sources don’t'} state ${names}`)
  }
  if (unchecked > 0) {
    parts.push(`${unchecked} ${unchecked === 1 ? 'phone' : 'phones'} hidden: ${unchecked === 1 ? 'its specs' : 'their specs'} couldn’t be checked`)
  }
  return parts.length ? `${parts.join('. ')}.` : null
}

/** Sorted copy by a spec; phones whose source doesn't state it go last, by name. */
export function sortBySpec(gadgets, moreById, sortKey) {
  const { field, direction } = SPEC_SORTS[sortKey]
  const amount = (g) => moreById?.[g.id]?.[field]?.amount ?? null
  return [...gadgets].sort((a, b) => {
    const x = amount(a)
    const y = amount(b)
    if (x == null || y == null) return x == null && y == null ? a.name.localeCompare(b.name) : x == null ? 1 : -1
    return (x - y) * direction || a.name.localeCompare(b.name)
  })
}
