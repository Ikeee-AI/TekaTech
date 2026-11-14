// Shopper-facing names (14 Nov 2026): a brand is never shown twice, in names or in
// saved popular questions.
import { describe, expect, it } from 'vitest'
import { gadgetDisplayName, questionDisplayText, withoutDoubledBrand } from './gadgetName'

describe('withoutDoubledBrand', () => {
  it('collapses a brand written twice at the start', () => {
    expect(withoutDoubledBrand('Infinix Infinix Note 40')).toBe('Infinix Note 40')
    expect(withoutDoubledBrand('samsung Samsung Galaxy A55')).toBe('Samsung Galaxy A55')
  })

  it('leaves ordinary names alone', () => {
    expect(withoutDoubledBrand('Infinix Note 40')).toBe('Infinix Note 40')
    expect(withoutDoubledBrand('Pixel 9')).toBe('Pixel 9')
    expect(withoutDoubledBrand('')).toBe('')
    expect(withoutDoubledBrand(undefined)).toBe('')
  })
})

describe('gadgetDisplayName', () => {
  it('adds the brand only when the name does not start with it', () => {
    expect(gadgetDisplayName({ brand: 'Google', name: 'Pixel 9' })).toBe('Google Pixel 9')
    expect(gadgetDisplayName({ brand: 'Infinix', name: 'Infinix Note 40' })).toBe('Infinix Note 40')
    expect(gadgetDisplayName({ brand: 'LG', name: 'LGX Pad' })).toBe('LG LGX Pad')
  })

  it('never doubles the brand, even when the stored name already does', () => {
    expect(gadgetDisplayName({ brand: 'Infinix', name: 'Infinix Infinix Note 40' })).toBe('Infinix Note 40')
  })
})

describe('questionDisplayText', () => {
  it('shows a doubled brand once inside a question', () => {
    expect(questionDisplayText('What are the key specs of the Infinix Infinix Note 40?')).toBe(
      'What are the key specs of the Infinix Note 40?',
    )
  })

  it('keeps questions without a doubled word unchanged', () => {
    const q = 'Which phone has the best battery life?'
    expect(questionDisplayText(q)).toBe(q)
  })
})
