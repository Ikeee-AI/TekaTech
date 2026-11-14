// Spec filters and sorts in the catalog toolbar (owner decision, 14 Nov 2026): battery and
// charging floors, an IP67+ toggle and battery/charging/weight sorts, all from the specs the
// catalog already fetched. Phones whose source doesn't state a filtered spec are hidden and
// the catalog says so; each filter shows as a removable pill.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GadgetList from './GadgetList'

const gadgets = [
  { id: 'vivo', name: 'X200 FE', brand: 'vivo', category: 'Smartphone', price_php: 30000, release_date: null },
  { id: 'a36', name: 'Galaxy A36 5G', brand: 'Samsung', category: 'Smartphone', price_php: 20000, release_date: null },
  { id: 'reno', name: 'Reno14 F 5G', brand: 'OPPO', category: 'Smartphone', price_php: 18000, release_date: null },
  { id: 'ip', name: 'iPhone 16', brand: 'Apple', category: 'Smartphone', price_php: 50000, release_date: null },
]
const spec = (id, content) => [{ id: `${id}-s`, gadget_id: id, content, source_url: null, chunk_index: 0 }]
const specs = {
  vivo: spec('vivo', 'Battery: single cell, typical capacity 6500 mAh (3.83V)\nCharging power: 90W FlashCharge\nWeight: 186 g\nIngress protection: IP68 and IP69'),
  a36: spec('a36', 'Battery capacity (typical): 5000 mAh\nWeight: 195 g\nWater resistance: IP67'),
  reno: spec('reno', 'Battery: 6000mAh/23.52Wh (typical)\nFast charging: 45W SUPERVOOC, 33W SUPERVOOC\nWeight: about 180 g'),
  ip: spec('ip', 'Battery: built-in rechargeable lithium-ion\nWeight: 170 grams\nWater resistance: IP68'),
}

vi.mock('../api/client', () => ({
  api: {
    getGadgets: () => Promise.resolve(gadgets),
    getSpecs: (id) => Promise.resolve(specs[id] ?? []),
    getMyGadgets: () => Promise.resolve([]),
  },
}))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', app_metadata: {} } }) }))
vi.mock('../components/TrendingQuestions', () => ({ default: () => null }))

afterEach(cleanup)

async function renderCatalog() {
  render(
    <MemoryRouter>
      <GadgetList />
    </MemoryRouter>,
  )
  const battery = await screen.findByLabelText('Battery')
  // The spec filters wait for the specs; they are enabled once those have loaded.
  await waitFor(() => expect(battery.disabled).toBe(false))
  return battery
}

const catalog = () => screen.getByRole('region', { name: /phones \d/ })
const cardNames = () => within(catalog()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent.trim())

describe('Catalog spec filters', () => {
  it('filters by battery, says which phones are hidden and why, and removes the filter from its pill', async () => {
    const battery = await renderCatalog()
    fireEvent.change(battery, { target: { value: '6000' } })

    expect(cardNames()).toEqual(['Reno14 F 5G', 'X200 FE'])
    expect(within(catalog()).getByText('1 phone hidden: its source doesn’t state battery.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Battery ≥ 6,000 mAh' }))
    expect(cardNames()).toHaveLength(4)
  })

  it('filters by wired charging power', async () => {
    await renderCatalog()
    fireEvent.change(screen.getByLabelText('Charging'), { target: { value: '65' } })
    expect(cardNames()).toEqual(['X200 FE'])
    expect(screen.getByRole('button', { name: 'Remove filter Charging ≥ 65 W' })).toBeTruthy()
  })

  it('keeps only IP67+ phones with the water toggle', async () => {
    await renderCatalog()
    const toggle = screen.getByRole('button', { name: 'Water resistant (IP67+)' })
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(cardNames()).toEqual(['Galaxy A36 5G', 'iPhone 16', 'X200 FE'])
    expect(within(catalog()).getByText('1 phone hidden: its source doesn’t state an IP rating.')).toBeTruthy()
  })

  it('explains an empty result caused by unstated specs', async () => {
    await renderCatalog()
    // Up to ₱20,240 leaves the Galaxy (no charging power stated) and the Reno (45 W).
    fireEvent.change(screen.getByLabelText('Max Price'), { target: { value: '20240' } })
    fireEvent.change(screen.getByLabelText('Charging'), { target: { value: '65' } })
    expect(screen.getByText('No Phones Match Your Filters')).toBeTruthy()
    expect(screen.getByText('1 phone hidden: its source doesn’t state charging power.')).toBeTruthy()
  })

  it('sorts by battery, charging and weight with unstated phones last', async () => {
    await renderCatalog()
    const sort = screen.getByLabelText('Sort by')
    fireEvent.change(sort, { target: { value: 'battery' } })
    expect(cardNames()).toEqual(['X200 FE', 'Reno14 F 5G', 'Galaxy A36 5G', 'iPhone 16'])
    fireEvent.change(sort, { target: { value: 'charging' } })
    expect(cardNames()).toEqual(['X200 FE', 'Reno14 F 5G', 'Galaxy A36 5G', 'iPhone 16'])
    fireEvent.change(sort, { target: { value: 'weight' } })
    expect(cardNames()).toEqual(['iPhone 16', 'Reno14 F 5G', 'X200 FE', 'Galaxy A36 5G'])
  })

  it('collapses the filters behind a Filters button that shows how many are on', async () => {
    const battery = await renderCatalog()
    const button = screen.getByRole('button', { name: 'Filters' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    fireEvent.change(battery, { target: { value: '5000' } })
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeTruthy()
  })
})
