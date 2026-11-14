import { describe, expect, it } from 'vitest'
import { applySpecFilters, hiddenNote, sortBySpec } from './specFilters'
import { extractMoreSpecs } from './keySpecs'

const phone = (id, name, content) => ({ gadget: { id, name }, more: extractMoreSpecs([{ content }]) })
const phones = [
  phone('vivo', 'vivo X200 FE', 'Battery: single cell, typical capacity 6500 mAh (3.83V)\nCharging power: 90W FlashCharge\nWeight: 186 g\nIngress protection: IP68 and IP69'),
  phone('a36', 'Galaxy A36 5G', 'Battery capacity (typical): 5000 mAh\nWeight: 195 g\nWater resistance: IP67'),
  phone('reno', 'Reno14 F 5G', 'Battery: 6000mAh/23.52Wh (typical)\nFast charging: 45W SUPERVOOC, 33W SUPERVOOC\nWeight: about 180 g'),
  phone('ip', 'iPhone 16', 'Weight: 170 grams\nWater resistance: IP68'),
  phone('realme', 'realme 14 Pro 5G', 'Battery: 6000mAh (typ.)\nCharging adapter: 45W SUPERVOOC\nWater and dust resistance: IP69, IP68, IP66 rated'),
]
const gadgets = phones.map((p) => p.gadget)
const moreById = Object.fromEntries(phones.map((p) => [p.gadget.id, p.more]))
const ids = (list) => list.map((g) => g.id)

describe('applySpecFilters', () => {
  it('passes everything through when no spec filter is set', () => {
    const r = applySpecFilters(gadgets, moreById, {})
    expect(r.list).toBe(gadgets)
    expect(hiddenNote(r)).toBeNull()
  })

  it('keeps phones at or above the battery floor and counts phones whose source is silent', () => {
    const r = applySpecFilters(gadgets, moreById, { minBattery: 6000 })
    expect(ids(r.list)).toEqual(['vivo', 'reno', 'realme'])
    expect(r.unstated).toEqual({ count: 1, fields: ['battery'] })
    expect(hiddenNote(r)).toBe('1 phone hidden: its source doesn’t state battery.')
  })

  it('filters on wired charging power', () => {
    const r = applySpecFilters(gadgets, moreById, { minCharging: 65 })
    expect(ids(r.list)).toEqual(['vivo'])
    expect(hiddenNote(r)).toBe('2 phones hidden: their sources don’t state charging power.')
  })

  it('treats IP67 and better as water resistant', () => {
    const r = applySpecFilters(gadgets, moreById, { waterResistant: true })
    expect(ids(r.list)).toEqual(['vivo', 'a36', 'ip', 'realme'])
    expect(r.unstated.count).toBe(1)
  })

  it('names every unstated spec when several filters are on', () => {
    const r = applySpecFilters(gadgets, moreById, { minBattery: 4000, minCharging: 30 })
    expect(ids(r.list)).toEqual(['vivo', 'reno', 'realme'])
    expect(hiddenNote(r)).toBe('2 phones hidden: their sources don’t state battery or charging power.')
  })

  it('says when a phone’s specs could not be checked', () => {
    const r = applySpecFilters([...gadgets, { id: 'x', name: 'No specs' }], moreById, { minBattery: 4000 })
    expect(r.unchecked).toBe(1)
    expect(hiddenNote(r)).toMatch(/1 phone hidden: its specs couldn’t be checked/)
  })
})

describe('sortBySpec', () => {
  it('sorts battery high to low, ties by name, unstated last', () => {
    expect(ids(sortBySpec(gadgets, moreById, 'battery'))).toEqual(['vivo', 'realme', 'reno', 'a36', 'ip'])
  })

  it('sorts charging fast to slow, unstated last by name', () => {
    expect(ids(sortBySpec(gadgets, moreById, 'charging'))).toEqual(['vivo', 'realme', 'reno', 'a36', 'ip'])
  })

  it('sorts weight light to heavy', () => {
    expect(ids(sortBySpec(gadgets, moreById, 'weight'))).toEqual(['ip', 'reno', 'vivo', 'a36', 'realme'])
  })
})
