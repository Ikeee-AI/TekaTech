import { describe, expect, it } from 'vitest'
import {
  EMPTY_GADGET,
  IMAGE_LINK_FAILED,
  IMAGE_LINK_UNCHECKED,
  looksLikeImageUrl,
  toGadgetPayload,
  validateGadget,
} from './gadgetValidation'

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

describe('image links (#202)', () => {
  it.each([
    ['https://example.com/poco-x7.png', true],
    ['https://example.com/a/b/PHOTO.JPG', true],
    ['https://example.com/pic.webp?v=2', true],
    ['https://example.com/pic.avif', true],
    ['https://cdn.example.com/is/image/s24?fmt=jpeg&wid=600', true],
    ['https://cdn.example.com/img/123?format=webp', true],
    ['https://www.example.com/poco-x7-pro', false],
    ['https://www.example.com/product.html', false],
    ['https://www.example.com/search?q=poco+x7+pro', false],
    ['not a url', false],
  ])('looksLikeImageUrl(%j) is %s', (url, expected) => {
    expect(looksLikeImageUrl(url)).toBe(expected)
  })

  const withImage = (image_url, imageStatus) => validateGadget(form({ image_url }), { imageStatus }).image_url

  it('blocks a link the preview could not load, even with an image extension', () => {
    expect(withImage('https://example.com/poco.png', 'failed')).toBe(IMAGE_LINK_FAILED)
  })

  it('accepts any link once the preview has loaded it as an image', () => {
    expect(withImage('https://cdn.example.com/is/image/s24', 'loaded')).toBeUndefined()
  })

  it('while the preview is pending, accepts an image extension and asks about anything else', () => {
    expect(withImage('https://example.com/poco.png', 'pending')).toBeUndefined()
    expect(withImage('https://www.example.com/poco-x7-pro', 'pending')).toBe(IMAGE_LINK_UNCHECKED)
  })

  it('still reports a non-http link first, and an empty link is fine', () => {
    expect(withImage('example.com/poco.png', 'failed')).toMatch(/http:\/\/ or https:\/\//)
    expect(withImage('', 'failed')).toBeUndefined()
  })
})

describe('sourced prices (14 Nov 2026)', () => {
  const base = { ...EMPTY_GADGET, name: 'Galaxy S25', brand: 'Samsung', category: 'Smartphone' }

  it('refuses non-http source and store links, and a future checked date', () => {
    const errors = validateGadget({
      ...base, price_source_url: 'javascript:alert(1)', store_url: 'samsung.com/ph', price_checked_at: '2999-01-01',
    })
    expect(Object.keys(errors).sort()).toEqual(['price_checked_at', 'price_source_url', 'store_url'])
  })

  it('sends the three fields, trimmed, and clears them on edit with null', () => {
    const form = { ...base, price_source_url: ' https://www.samsung.com/ph/x/ ', price_checked_at: '2026-11-14', store_url: 'https://www.samsung.com/ph/' }
    expect(validateGadget(form)).toEqual({})
    const payload = toGadgetPayload(form)
    expect(payload.price_source_url).toBe('https://www.samsung.com/ph/x/')
    expect(payload.price_checked_at).toBe('2026-11-14')
    expect(payload.store_url).toBe('https://www.samsung.com/ph/')
    const cleared = toGadgetPayload(base, form)
    expect(cleared.price_source_url).toBeNull()
    expect(cleared.price_checked_at).toBeNull()
    expect(cleared.store_url).toBeNull()
  })
})

describe('launch price flag (15 Nov 2026)', () => {
  it('is left out of a new gadget unless ticked', () => {
    expect(toGadgetPayload(form({})).price_is_launch).toBeUndefined()
    expect(toGadgetPayload(form({ price_is_launch: true })).price_is_launch).toBe(true)
  })

  it('on edit, is sent only when it changed', () => {
    const before = form({ price_is_launch: false })
    expect(toGadgetPayload(form({ price_is_launch: false }), before).price_is_launch).toBeUndefined()
    expect(toGadgetPayload(form({ price_is_launch: true }), before).price_is_launch).toBe(true)
    const wasLaunch = form({ price_is_launch: true })
    expect(toGadgetPayload(form({ price_is_launch: false }), wasLaunch).price_is_launch).toBe(false)
  })
})
