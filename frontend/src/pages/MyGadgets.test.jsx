// My Gadgets dashboard: starts empty with a way to the catalog, lists the user's
// gadgets, removes one, and only enables "Compare & Ask AI" for 2–5 selected gadgets.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import MyGadgets from './MyGadgets'

const api = vi.hoisted(() => ({ getMyGadgets: vi.fn(), removeMyGadget: vi.fn() }))
vi.mock('../api/client', () => ({ api }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const gadget = (n) => ({ id: `id-${n}`, name: `Phone ${n}`, brand: 'Brand', category: 'Smartphone', price_php: 1000 * n })
const item = (n) => ({ added_at: '2026-11-03T04:00:00+00:00', gadget: gadget(n) })

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/my-gadgets']}>
      <Routes>
        <Route path="/my-gadgets" element={<MyGadgets />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.getMyGadgets.mockReset()
  api.removeMyGadget.mockReset()
})
afterEach(cleanup)

describe('My Gadgets dashboard', () => {
  it('is empty at first and points to the catalog', async () => {
    api.getMyGadgets.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('Your Dashboard Is Empty')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: /browse the catalog/i }))
    expect(screen.getByTestId('where').textContent).toBe('/')
  })

  it('lists the user’s gadgets', async () => {
    api.getMyGadgets.mockResolvedValue([item(1), item(2)])
    renderPage()
    expect(await screen.findByRole('link', { name: 'Phone 1' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Phone 2' })).toBeTruthy()
  })

  it('removes a gadget from the list only after the API confirms', async () => {
    api.getMyGadgets.mockResolvedValue([item(1), item(2)])
    api.removeMyGadget.mockResolvedValue(null)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /remove phone 1/i }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Phone 1' })).toBeNull())
    expect(api.removeMyGadget).toHaveBeenCalledWith('id-1')
    expect(screen.getByRole('link', { name: 'Phone 2' })).toBeTruthy()
  })

  it('enables Compare & Ask AI only from two selected gadgets, then opens Compare with them', async () => {
    api.getMyGadgets.mockResolvedValue([item(1), item(2), item(3)])
    renderPage()
    fireEvent.click(await screen.findByRole('checkbox', { name: /phone 1/i }))
    const compare = screen.getByRole('button', { name: /compare & ask ai/i })
    expect(compare.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /phone 3/i }))
    expect(compare.disabled).toBe(false)
    fireEvent.click(compare)
    expect(screen.getByTestId('where').textContent).toBe('/compare?ids=id-1,id-3')
  })

  it('caps the selection at five gadgets', async () => {
    api.getMyGadgets.mockResolvedValue([1, 2, 3, 4, 5, 6].map(item))
    renderPage()
    await screen.findByRole('link', { name: 'Phone 1' })
    for (const n of [1, 2, 3, 4, 5, 6]) fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`phone ${n}`, 'i') }))
    expect(screen.getByRole('checkbox', { name: /phone 6/i }).checked).toBe(false)
    expect(screen.getByText('5 selected', { selector: 'span' })).toBeTruthy()
  })

  it('shows a retryable error when the list cannot load', async () => {
    api.getMyGadgets.mockRejectedValueOnce(Object.assign(new Error('down'), { status: 503 }))
    renderPage()
    expect(await screen.findByText("Couldn't Load Your Gadgets")).toBeTruthy()
  })
})
