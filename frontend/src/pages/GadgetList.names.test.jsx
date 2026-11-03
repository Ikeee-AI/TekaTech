// #207: controls whose accessible name adds the gadget name must read as separate words
// ("Ask AI about Phone 1", not "Ask AIabout Phone 1"). getByRole matches the computed
// accessible name exactly, so a lost space fails these tests.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GadgetCard } from './GadgetList'

vi.mock('../api/client', () => ({ api: {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))

const gadget = { id: 'id-1', name: 'Phone 1', brand: 'Brand', category: 'Smartphone', price_php: 1000, release_date: null }

afterEach(cleanup)

describe('catalog card accessible names', () => {
  it('names each control with a space before the gadget name', () => {
    render(
      <MemoryRouter>
        <GadgetCard gadget={gadget} selected={false} onToggle={() => {}} onAsk={() => {}} mine={null} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('checkbox', { name: 'Compare Phone 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask AI about Phone 1' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Details for Phone 1' })).toBeTruthy()
  })
})
