import { describe, expect, it } from 'vitest'
import { EMPTY_GADGET, toGadgetPayload, validateGadget } from './gadgetValidation'

const VALID = {
  ...EMPTY_GADGET,
  name: 'Pixel 9',
  brand: 'Google',
  category: 'Smartphone',
}

const form = (overrides) => ({ ...VALID, ...overrides })

describe('validateGadget', () => {
  it('accepts a form with only the required fields', () => {
    expect(validateGadget(VALID)).toEqual({})
  })

  it('reports every blank required field at once, treating whitespace as blank', () => {
    const errors = validateGadget({ ...EMPTY_GADGET, name: '   ', brand: '\t' })
    expect(Object.keys(errors).sort()).toEqual(['brand', 'category', 'name'])
  })

  it.each([
    ['name', 120],
    ['brand', 80],
    ['category', 60],
  ])('allows %s at %i characters and rejects one more', (field, max) => {
    expect(validateGadget(form({ [field]: 'a'.repeat(max) }))[field]).toBeUndefined()
    expect(validateGadget(form({ [field]: 'a'.repeat(max + 1) }))[field]).toMatch(/under/)
  })

  it('measures length after trimming surrounding spaces', () => {
    expect(validateGadget(form({ name: `  ${'a'.repeat(120)}  ` })).name).toBeUndefined()
  })

  it.each([
    ['2024-08-22', true],
    ['1970-01-01', true],
    ['2100-12-31', true],
    ['1969-12-31', false],
    ['2101-01-01', false],
    ['not-a-date', false],
  ])('release date %s valid=%s', (release_date, ok) => {
    expect(validateGadget(form({ release_date })).release_date === undefined).toBe(ok)
  })

  it.each([
    ['', true],
    ['0', true],
    ['24999.50', true],
    ['10000000', true],
    ['10000001', false],
    ['-1', false],
    ['abc', false],
  ])('price %j valid=%s', (price_php, ok) => {
    expect(validateGadget(form({ price_php })).price_php === undefined).toBe(ok)
  })

  it.each([
    ['', true],
    ['   ', true],
    ['https://example.com/pixel.png', true],
    ['http://example.com/pixel.png', true],
    ['example.com/pixel.png', false],
    ['ftp://example.com/pixel.png', false],
    ['javascript:alert(1)', false],
    ['data:image/png;base64,AAAA', false],
  ])('image URL %j valid=%s', (image_url, ok) => {
    expect(validateGadget(form({ image_url })).image_url === undefined).toBe(ok)
  })
})

describe('toGadgetPayload', () => {
  it('trims text and leaves blank optional fields out', () => {
    const payload = toGadgetPayload(form({ name: '  Pixel 9 ', image_url: '   ' }))
    expect(payload).toEqual({
      name: 'Pixel 9',
      brand: 'Google',
      category: 'Smartphone',
      release_date: undefined,
      price_php: undefined,
      image_url: undefined,
    })
    expect(JSON.parse(JSON.stringify(payload))).toEqual({ name: 'Pixel 9', brand: 'Google', category: 'Smartphone' })
  })

  it('converts price to a number and keeps a zero price', () => {
    expect(toGadgetPayload(form({ price_php: '24999.5' })).price_php).toBe(24999.5)
    expect(toGadgetPayload(form({ price_php: '0' })).price_php).toBe(0)
  })

  it('passes the date and trimmed image URL through', () => {
    const payload = toGadgetPayload(form({ release_date: '2024-08-22', image_url: ' https://x.test/a.png ' }))
    expect(payload.release_date).toBe('2024-08-22')
    expect(payload.image_url).toBe('https://x.test/a.png')
  })
})
