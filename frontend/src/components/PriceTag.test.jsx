import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PriceTag from './PriceTag'
import { formatCheckedDate, priceSourceLabel } from '../utils/priceSource'

afterEach(cleanup)

describe('priceSourceLabel', () => {
  it('keeps the site and a country path', () => {
    expect(priceSourceLabel('https://www.samsung.com/ph/smartphones/galaxy-s25/buy/')).toBe('samsung.com/ph')
    expect(priceSourceLabel('https://www.apple.com/ph/shop/buy-iphone/iphone-16')).toBe('apple.com/ph')
    expect(priceSourceLabel('https://www.po.co/global/product/x7')).toBe('po.co')
  })
  it('refuses non-http links', () => {
    expect(priceSourceLabel('javascript:alert(1)')).toBeNull()
    expect(priceSourceLabel(null)).toBeNull()
  })
})

describe('formatCheckedDate', () => {
  it('reads the calendar date without a timezone shift', () => {
    expect(formatCheckedDate('2026-11-14', new Date(2026, 0, 1))).toBe('14 Nov')
    expect(formatCheckedDate('2025-01-02', new Date(2026, 0, 1))).toBe('2 Jan 2025')
    expect(formatCheckedDate(null)).toBeNull()
  })
})

describe('PriceTag', () => {
  it('shows the price and links to its official source in a new tab', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-11-14`
    render(<p><PriceTag gadget={{ price_php: 49990, price_source_url: 'https://www.samsung.com/ph/x/', price_checked_at: iso }} /></p>)
    expect(screen.getByText('₱49,990')).toBeTruthy()
    const link = screen.getByRole('link', { name: /samsung\.com\/ph · checked 14 Nov/ })
    expect(link.getAttribute('href')).toBe('https://www.samsung.com/ph/x/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('still shows a price without a source, labelled as such', () => {
    render(<p><PriceTag gadget={{ price_php: 12999 }} /></p>)
    expect(screen.getByText('₱12,999')).toBeTruthy()
    expect(screen.getByText('source not given')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not link a non-http source', () => {
    render(<p><PriceTag gadget={{ price_php: 1, price_source_url: 'javascript:alert(1)' }} /></p>)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('source not given')).toBeTruthy()
  })

  it('shows the empty fallback when there is no price', () => {
    render(<p><PriceTag gadget={{ price_php: null }} empty="No price yet" /></p>)
    expect(screen.getByText('No price yet')).toBeTruthy()
  })
})

describe('PriceTag launch price (15 Nov 2026)', () => {
  it('labels a launch price before its source', () => {
    render(<p><PriceTag gadget={{ price_php: 56990, price_is_launch: true, price_source_url: 'https://www.technobaboy.com/2023/09/13/x/', price_checked_at: '2026-11-14' }} /></p>)
    expect(screen.getByText(/launch price ·/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /technobaboy\.com/ })).toBeTruthy()
  })

  it('labels a launch price without a source too', () => {
    render(<p><PriceTag gadget={{ price_php: 56990, price_is_launch: true }} /></p>)
    expect(screen.getByText('launch price · source not given')).toBeTruthy()
  })

  it('adds nothing for a current price', () => {
    render(<p><PriceTag gadget={{ price_php: 49990, price_source_url: 'https://www.samsung.com/ph/x/' }} /></p>)
    expect(screen.queryByText(/launch price/)).toBeNull()
  })
})
