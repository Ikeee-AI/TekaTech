// Brand carousel (22 Nov 2026): one sliding row instead of wrapping onto a second line.
// Arrows page the row and hide when there is nothing more on their side.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import TileCarousel from './TileCarousel'

afterEach(cleanup)

function setup({ scrollLeft = 0, clientWidth = 500, scrollWidth = 1200 } = {}) {
  render(
    <TileCarousel label="brands">
      <button type="button">One</button>
      <button type="button">Two</button>
    </TileCarousel>,
  )
  const track = screen.getByRole('group', { name: 'brands' })
  Object.defineProperties(track, {
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
    scrollLeft: { configurable: true, writable: true, value: scrollLeft },
  })
  track.scrollBy = vi.fn()
  fireEvent.scroll(track)
  return track
}

describe('TileCarousel', () => {
  it('keeps every tile in one labelled row', () => {
    setup()
    const track = screen.getByRole('group', { name: 'brands' })
    expect(track.className).toContain('overflow-x-auto')
    expect(track.className).not.toMatch(/flex-wrap|grid/)
    expect(track.textContent).toBe('OneTwo')
  })

  it('at the start: only the right arrow works, and it pages right', () => {
    const track = setup()
    const left = screen.getByRole('button', { name: 'Scroll brands left' })
    const right = screen.getByRole('button', { name: 'Scroll brands right' })
    expect(left.disabled).toBe(true)
    expect(right.disabled).toBe(false)
    fireEvent.click(right)
    expect(track.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 400 }))
  })

  it('at the end: only the left arrow works', () => {
    setup({ scrollLeft: 700 })
    expect(screen.getByRole('button', { name: 'Scroll brands left' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Scroll brands right' }).disabled).toBe(true)
  })

  it('everything fits: no arrows at all', () => {
    setup({ clientWidth: 1200, scrollWidth: 1200 })
    expect(screen.queryByRole('button', { name: /Scroll brands/ })).toBeNull()
  })
})
