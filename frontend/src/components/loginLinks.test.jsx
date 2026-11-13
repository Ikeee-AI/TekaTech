// #196 item 4 / #249 review: every way into Log In passes the page the user is on, so
// signing up from there can bring them back after the confirmation email.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import { api } from '../api/client'
import Navbar from './Navbar'
import GadgetChatPanel from './GadgetChatPanel'
import SpecManager from './SpecManager'
import AuthLinkNotice from './AuthLinkNotice'

vi.mock('../api/client', () => ({
  api: { getSpecs: vi.fn(), indexSpec: vi.fn(), getGadgetQuestions: vi.fn(), askQuestion: vi.fn(), clearGadgetQuestions: vi.fn() },
}))

/** Shows where the router is and which page Log In was told to return to. */
function Probe() {
  const location = useLocation()
  const from = location.state?.from
  return (
    <>
      <output data-testid="page">{location.pathname + location.search}</output>
      <output data-testid="from">{from ? from.pathname + (from.search ?? '') : 'none'}</output>
    </>
  )
}

function renderAt(url, ui) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthContext.Provider value={{ user: null, loading: false, signOut: vi.fn() }}>
        {ui}
        <Probe />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const page = () => screen.getByTestId('page').textContent
const from = () => screen.getByTestId('from').textContent

beforeAll(() => {
  Element.prototype.scrollTo = function scrollTo() {}
})

beforeEach(() => {
  api.getSpecs.mockResolvedValue([{ id: 's1', gadget_id: 'g1', content: 'Battery: 4700 mAh', chunk_index: 0, indexing_status: 'indexed' }])
  api.getGadgetQuestions.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe('Log In links remember the current page', () => {
  it('top bar Log In (desktop)', () => {
    renderAt('/gadgets/g1?ask=chip', <Navbar />)
    fireEvent.click(screen.getAllByRole('link', { name: /log in/i })[0])
    expect(page()).toBe('/login')
    expect(from()).toBe('/gadgets/g1?ask=chip')
  })

  it('top bar Log In (phone menu)', () => {
    renderAt('/compare?ids=a,b', <Navbar />)
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    const links = screen.getAllByRole('link', { name: /^log in$/i })
    fireEvent.click(links[links.length - 1])
    expect(page()).toBe('/login')
    expect(from()).toBe('/compare?ids=a,b')
  })

  it('top bar Log In on the log-in page itself passes nothing', () => {
    renderAt('/login?mode=signup', <Navbar />)
    fireEvent.click(screen.getAllByRole('link', { name: /log in/i })[0])
    expect(from()).toBe('none')
  })

  it('"Log in to keep this conversation" on the gadget chat', async () => {
    renderAt('/gadgets/g1', <GadgetChatPanel gadgetId="g1" gadgetName="Pixel 9" />)
    fireEvent.click(await screen.findByRole('link', { name: /log in/i }))
    expect(page()).toBe('/login')
    expect(from()).toBe('/gadgets/g1')
  })

  it('"Log In to Suggest Corrections" on the spec cards', async () => {
    renderAt('/gadgets/g1', <SpecManager gadgetId="g1" />)
    fireEvent.click(await screen.findByRole('link', { name: /log in to suggest corrections/i }))
    expect(page()).toBe('/login')
    expect(from()).toBe('/gadgets/g1')
  })

  it('"Send a New Link" on the expired-link notice', () => {
    renderAt('/gadgets/g1', <AuthLinkNotice link={{ kind: 'error', code: 'otp_expired' }} pathname="/gadgets/g1" />)
    fireEvent.click(screen.getByRole('link', { name: /send a new link/i }))
    expect(page()).toBe('/login?mode=resend')
    expect(from()).toBe('/gadgets/g1')
  })
})
