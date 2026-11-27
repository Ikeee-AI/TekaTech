// Public content pages and footer (owner decision, 14 Nov 2026, critique items #2 and #3).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import HowItWorks from '../components/HowItWorks'

const auth = vi.hoisted(() => ({ user: null, loading: false }))

vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('../components/Navbar', () => ({ default: () => null }))
vi.mock('../components/ServerWakeBanner', () => ({ default: () => null }))
vi.mock('../components/AuthLinkNotice', () => ({ default: () => null }))
vi.mock('./GadgetList', () => ({ default: () => <p>Catalog page</p> }))

function renderAt(url, user = null) {
  auth.user = user
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

const PAGES = [
  ['/about', 'About TekaTech'],
  ['/how-it-works', 'How it works'],
  ['/faq', 'Frequently asked questions'],
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Use'],
  ['/contact', 'Contact'],
]

describe('content pages', () => {
  for (const [url, title] of PAGES) {
    it(`renders ${url} for a signed-out visitor`, async () => {
      renderAt(url)
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy()
    })
  }

  it('lists every data processor on the privacy page, with the draft note and date', async () => {
    renderAt('/privacy')
    await screen.findByRole('heading', { level: 1, name: 'Privacy Policy' })
    const processors = screen.getByRole('heading', { name: 'Who processes it for us' }).parentElement
    for (const name of ['Supabase', 'OpenAI', 'Brevo', 'Railway', 'Render']) {
      expect(within(processors).getByText(name)).toBeTruthy()
    }
    expect(screen.getByText(/reviewed by the TekaTech team; not legal advice/)).toBeTruthy()
    expect(screen.getByText('Last updated: 14 November 2026')).toBeTruthy()
    expect(screen.getByText(/Republic Act No\. 10173/)).toBeTruthy()
  })

  it('shows the draft note on the terms page', async () => {
    renderAt('/terms')
    await screen.findByRole('heading', { level: 1, name: 'Terms of Use' })
    expect(screen.getByText(/not legal advice/)).toBeTruthy()
  })

  it('gives the contact email as a mail link', async () => {
    renderAt('/contact')
    const link = await screen.findByRole('link', { name: 'tekatechemail@gmail.com' })
    expect(link.getAttribute('href')).toBe('mailto:tekatechemail@gmail.com')
  })
})

describe('footer', () => {
  it('links to every content page and names the project', async () => {
    renderAt('/')
    await screen.findByText('Catalog page')
    const nav = screen.getByRole('navigation', { name: 'Footer' })
    const expected = {
      About: '/about',
      'How it works': '/how-it-works',
      FAQ: '/faq',
      Privacy: '/privacy',
      Terms: '/terms',
      Contact: '/contact',
    }
    for (const [label, href] of Object.entries(expected)) {
      expect(within(nav).getByRole('link', { name: label }).getAttribute('href')).toBe(href)
    }
    expect(screen.getByText('© 2026 TekaTech — a student project · Demo Day release')).toBeTruthy()
  })
})

describe('home value strip', () => {
  function renderStrip(signedIn) {
    render(
      <MemoryRouter>
        <HowItWorks signedIn={signedIn} />
      </MemoryRouter>,
    )
  }

  it('tells visitors an account is needed', () => {
    renderStrip(false)
    expect(screen.getByText('Free account needed to view full specs, compare and ask the AI.')).toBeTruthy()
    expect(screen.getByText(/Every spec links to the brand's official page/)).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('drops the account note for signed-in users', () => {
    renderStrip(true)
    expect(screen.queryByText(/Free account needed/)).toBeNull()
  })
})
