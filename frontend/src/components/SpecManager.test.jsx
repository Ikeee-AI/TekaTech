// Specifications section: chunks from one source share one card (link and date once,
// chunks as rows, a parts toggle), and "Label: value" lines read as a fact list.
// Index All Pending (#200) has its own tests in SpecManager.indexAll.test.jsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import SpecManager from './SpecManager'
import { groupSpecsBySource, specBlocks, specSection, specSections } from '../utils/specLayout'

vi.mock('../api/client', () => ({ api: { getSpecs: vi.fn(), indexSpec: vi.fn() } }))

const NOW = new Date().toISOString()
const spec = (id, chunk, content, source_url = 'https://www.gsmarena.com/pixel_9.php', status = 'indexed') => ({
  id,
  gadget_id: 'g1',
  content,
  source_url,
  chunk_index: chunk,
  verified_at: NOW,
  indexing_status: status,
})

const SPECS = [
  spec('a', 0, 'Display: 6.3-inch OLED\nBattery: 4700 mAh'),
  spec('b', 1, 'Chip: Tensor G4', undefined, 'pending'),
  spec('c', 2, 'Weight: 198 g', undefined, 'pending'),
  spec('d', 0, 'Colours include Obsidian and Porcelain.', null),
]

beforeEach(() => {
  api.getSpecs.mockResolvedValue(SPECS)
  api.indexSpec.mockResolvedValue({})
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSpecs(user = null) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user }}>
        <SpecManager gadgetId="g1" />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('spec layout helpers', () => {
  it('groups chunks by source link, keeping order', () => {
    const groups = groupSpecsBySource(SPECS)
    expect(groups.map((g) => g.specs.map((s) => s.id))).toEqual([['a', 'b', 'c'], ['d']])
    expect(groups[1].sourceUrl).toBeNull()
  })

  it('turns "Label: value" lines into facts and keeps other lines as text', () => {
    expect(specBlocks('Display: 6.3-inch OLED\nBattery: 4700 mAh\n\nIt ships with a charger.')).toEqual([
      { type: 'facts', items: [{ label: 'Display', value: '6.3-inch OLED' }, { label: 'Battery', value: '4700 mAh' }] },
      { type: 'text', text: 'It ships with a charger.' },
    ])
  })

  it('sorts fact labels into the spec-sheet sections', () => {
    expect(specSection('Display')).toBe('Display')
    expect(specSection('Refresh rate')).toBe('Display')
    expect(specSection('Chipset')).toBe('Performance')
    expect(specSection('Internal storage')).toBe('Performance')
    expect(specSection('Battery')).toBe('Battery & charging')
    expect(specSection('Wired charging')).toBe('Battery & charging')
    expect(specSection('Main camera')).toBe('Camera')
    expect(specSection('Front camera')).toBe('Camera')
    expect(specSection('Weight')).toBe('Build & durability')
    expect(specSection('IP rating')).toBe('Build & durability')
    expect(specSection('Bluetooth')).toBe('Connectivity')
    expect(specSection('NFC')).toBe('Connectivity')
    expect(specSection('Sensors')).toBe('Other')
  })

  it('groups a chunk by section in sheet order and keeps unlabelled lines as text', () => {
    const { sections, text } = specSections('Weight: 198 g\nBattery: 4700 mAh\nDisplay: 6.3-inch OLED\nShips with a case.')
    expect(sections.map((s) => s.title)).toEqual(['Display', 'Battery & charging', 'Build & durability'])
    expect(sections[0].items).toEqual([{ label: 'Display', value: '6.3-inch OLED' }])
    expect(text).toEqual(['Ships with a case.'])
  })

  it('does not treat a long sentence with a colon as a fact', () => {
    const line = 'According to the manufacturer and several independent reviews: it lasts a day.'
    expect(specBlocks(line)).toEqual([{ type: 'text', text: line }])
  })
})

describe('SpecManager', () => {
  it('shows one card per source with the link once and chunks as rows', async () => {
    renderSpecs({ id: 'admin', app_metadata: { is_admin: true } })
    const link = await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.getAllByRole('link', { name: /gsmarena\.com/ })).toHaveLength(1)
    const card = link.closest('li')
    expect(within(card).getAllByRole('listitem', { name: /^Spec #/ })).toHaveLength(3)
    expect(within(card).getByText('1 of 3 ready for AI')).toBeTruthy()
    expect(screen.getByText('No source link')).toBeTruthy()
    expect(screen.getAllByText('Display').map((el) => el.tagName)).toEqual(['H3', 'DT'])
    expect(screen.getByText('Battery & charging').tagName).toBe('H3')
  })

  it('shows the save date as "Added", not "Verified"', async () => {
    renderSpecs()
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.getAllByText(/^Added /).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Verified/)).toBeNull()
  })

  it('hides indexing wording from shoppers and keeps it for admins', async () => {
    renderSpecs({ id: 'u1', app_metadata: {} })
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.queryByText(/ready for AI/i)).toBeNull()
    expect(screen.queryByText(/Pending AI Indexing/)).toBeNull()
    expect(screen.queryByText(/can.t use this part/)).toBeNull()
    expect(screen.queryByText(/\d+ parts?$/)).toBeNull()
    expect(screen.queryByText('(4)')).toBeNull()
    cleanup()
    renderSpecs({ id: 'admin', app_metadata: { is_admin: true } })
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.getByText('1 of 3 ready for AI')).toBeTruthy()
    expect(screen.getByText('3 parts')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Index for AI' })).toHaveLength(2)
  })

  it('a regular user sees no indexing buttons', async () => {
    renderSpecs({ id: 'u1', app_metadata: {} })
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.queryByRole('button', { name: /Index/ })).toBeNull()
    // The second source starts closed, so only the first card's three parts are shown.
    expect(screen.getAllByRole('button', { name: /Suggest Correction/ })).toHaveLength(3)
  })

  it('the first source starts open, the others closed, and each one toggles', async () => {
    renderSpecs()
    const first = await screen.findByRole('button', { name: 'Hide specs from gsmarena.com' })
    expect(first.getAttribute('aria-expanded')).toBe('true')
    const second = screen.getByRole('button', { name: 'Show specs from no source link' })
    expect(second.getAttribute('aria-expanded')).toBe('false')
    const rowsOf = (button) => document.getElementById(button.getAttribute('aria-controls'))
    expect(rowsOf(second).hidden).toBe(true)
    fireEvent.click(second)
    expect(rowsOf(second).hidden).toBe(false)
    fireEvent.click(first)
    expect(rowsOf(first).hidden).toBe(true)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    // The header (source link) stays visible while closed.
    expect(screen.getByRole('link', { name: /gsmarena\.com/ })).toBeTruthy()
  })
})
