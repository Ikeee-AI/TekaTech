// Specifications section: every saved part merged into one sheet (each heading once, a
// section list, a search box); admins get the same sheet plus a Saved parts section.
// Index All Pending (#200) has its own tests in SpecManager.indexAll.test.jsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import SpecManager from './SpecManager'
import { groupSpecsBySource, mergedSheet, specBlocks, specHighlights, specSection, specSections } from '../utils/specLayout'

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
    expect(specSection('Sensors')).toBe('General')
    // Playback is battery life, not a camera spec; contrast is a display spec.
    expect(specSection('Video playback')).toBe('Battery & charging')
    expect(specSection('Audio playback')).toBe('Battery & charging')
    expect(specSection('Contrast ratio')).toBe('Display')
    expect(specSection('Video')).toBe('Camera')
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
  it('merges every part into one sheet, each heading once, keeping the part of each row', () => {
    const { sections, notes } = mergedSheet([
      spec('a', 0, 'Display: 6.3-inch OLED\nBattery: 4700 mAh'),
      spec('b', 1, 'Refresh rate: 120Hz\nShips with a case.'),
    ])
    expect(sections.map((s) => s.title)).toEqual(['Display', 'Battery & charging'])
    expect(sections[0].items.map((i) => [i.label, i.spec.id])).toEqual([
      ['Display', 'a'],
      ['Refresh rate', 'b'],
    ])
    expect(notes).toEqual([{ text: 'Ships with a case.', spec: expect.objectContaining({ id: 'b' }) }])
  })

  it('picks highlights the tiles do not show, word for word', () => {
    const picked = specHighlights([
      spec('a', 0, 'Display: Super Retina XDR, 6.1-inch OLED\nVideo playback: up to 22 hours\nChip: A18'),
      spec('b', 1, 'Front camera: TrueDepth, 12MP, f/1.9\nVideo: 4K Dolby Vision\nOperating system: iOS 18'),
    ])
    expect(picked.map((h) => [h.title, h.value])).toEqual([
      ['Display', 'Super Retina XDR, 6.1-inch OLED'],
      ['Battery life', 'up to 22 hours'],
      ['Front camera', 'TrueDepth, 12MP, f/1.9'],
      ['Video', '4K Dolby Vision'],
      ['Software', 'iOS 18'],
    ])
    expect(specHighlights([spec('a', 0, 'Display: OLED\nZoom: 5x optical')], 1).map((h) => h.title)).toEqual(['Display'])
    expect(specHighlights([spec('c', 0, 'Weight: 198 g')])).toEqual([])
    // 'Rear video' counts as Video; resolution and dimensions are later fill-ins.
    expect(
      specHighlights([spec('r', 0, 'Rear video: 4K at 30fps\nResolution: 2712 x 1220\nDimensions: 161 x 75 x 8 mm')]).map(
        (h) => [h.title, h.value],
      ),
    ).toEqual([
      ['Video', '4K at 30fps'],
      ['Resolution', '2712 x 1220'],
      ['Dimensions', '161 x 75 x 8 mm'],
    ])
    // A short list is filled from the fill-in rules, up to seven rows.
    const filled = specHighlights([
      spec(
        'v',
        0,
        'Display type: AMOLED\nLocal peak brightness: 4500 nits\nRear camera: 50 MP main, OIS\nRear camera: 50 MP wide\nBack cover: glass\nFingerprint sensor: in-display optical\nColours: Satin Black, Mist Purple\nOperating system: Funtouch OS 15',
      ),
    ])
    expect(filled.map((h) => [h.title, h.value])).toEqual([
      ['Display', 'AMOLED'],
      ['Software', 'Funtouch OS 15'],
      ['Brightness', '4500 nits'],
      ['Rear cameras', '50 MP main, OIS'],
      ['Build', 'glass'],
      ['Fingerprint', 'in-display optical'],
      ['Colours', 'Satin Black, Mist Purple'],
    ])
  })
})

describe('SpecManager', () => {
  it('shows one sheet: the source link once, each heading once, a section list with counts', async () => {
    renderSpecs()
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.getAllByRole('link', { name: /gsmarena\.com/ })).toHaveLength(1)
    expect(screen.getByText('No source link')).toBeTruthy()
    expect(screen.getAllByText('Display').map((el) => el.tagName)).toEqual(['SPAN', 'H3', 'DT'])
    expect(screen.getAllByText('Battery & charging').map((el) => el.tagName)).toEqual(['SPAN', 'H3'])
    const nav = screen.getByRole('navigation', { name: 'Spec sections' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Display1',
      'Performance1',
      'Battery & charging1',
      'Build & durability1',
    ])
    expect(screen.getByText('Colours include Obsidian and Porcelain.')).toBeTruthy()
  })

  it('shows the save date as "Added", not "Verified"', async () => {
    renderSpecs()
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.getAllByText(/^Added /).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Verified/)).toBeNull()
  })

  it('finds a spec by label or value and says when nothing matches', async () => {
    renderSpecs()
    const find = await screen.findByLabelText('Find a spec')
    fireEvent.change(find, { target: { value: 'tensor' } })
    expect(screen.getByText('Tensor G4')).toBeTruthy()
    expect(screen.queryByText('4700 mAh')).toBeNull()
    fireEvent.change(find, { target: { value: 'zzz' } })
    expect(screen.getByText(/No spec matches/)).toBeTruthy()
  })

  it('hides indexing wording from shoppers; admins get the same sheet plus Saved parts', async () => {
    renderSpecs({ id: 'u1', app_metadata: {} })
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.queryByText(/ready for AI/i)).toBeNull()
    expect(screen.queryByText(/Pending AI Indexing/)).toBeNull()
    expect(screen.queryByText('Saved parts')).toBeNull()
    expect(screen.queryByRole('button', { name: /Index/ })).toBeNull()
    cleanup()
    renderSpecs({ id: 'admin', app_metadata: { is_admin: true } })
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    // Same sheet and section list as a shopper, with Saved parts added at the end.
    const nav = screen.getByRole('navigation', { name: 'Spec sections' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Display1',
      'Performance1',
      'Battery & charging1',
      'Build & durability1',
      'Saved parts4',
    ])
    expect(screen.getByText('2 of 4 ready for AI')).toBeTruthy()
    expect(screen.getAllByRole('listitem', { name: /^Spec #/ })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Index for AI' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: /index all pending \(2\)/i })).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('a signed-in user can suggest a fix on every row, sent for the part that row came from', async () => {
    renderSpecs({ id: 'u1', app_metadata: {} })
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.queryByRole('button', { name: /Index/ })).toBeNull()
    // Four facts and one note.
    expect(screen.getAllByRole('button', { name: /Suggest Correction/ })).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest Correction for Chip' }))
    expect(screen.getByLabelText(/Suggested Correction/).value).toBe('Chip: Tensor G4')
  })

  it('a visitor sees no suggest buttons', async () => {
    renderSpecs()
    await screen.findByRole('link', { name: /gsmarena\.com/ })
    expect(screen.queryByRole('button', { name: /Suggest Correction/ })).toBeNull()
  })
})
