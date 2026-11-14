// The navbar search keeps what the user types in local state and only then writes it
// to ?q= (debounced, or at once on Enter/blur). These tests pin that contract: typed
// text is never replaced by a slower URL update, while a real outside URL change
// (back/forward, "Clear filters") still shows up in the box.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/authContextValue'
import Navbar from './Navbar'

// No signed-in user, so the correction badges never call the API; the mock only keeps
// the real Supabase client from being created in tests.
vi.mock('../api/client', () => ({ api: {} }))
// Signed-in renders would start the correction-badge polling; it is not under test here.
vi.mock('../hooks/useCorrectionBadges', () => ({
  useCorrectionBadges: () => ({ unseenDecisions: 0, pendingCount: 0 }),
}))

const MEMBER = { id: 'u-1', email: 'member@example.com', app_metadata: {}, user_metadata: {} }

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="location">{location.pathname + location.search}</output>
      <output data-testid="state">{JSON.stringify(location.state ?? null)}</output>
      <button type="button" onClick={() => navigate('/?q=phone')}>
        external q
      </button>
      <button type="button" onClick={() => navigate('/')}>
        external clear
      </button>
    </>
  )
}

function renderNavbar(initialEntry = '/', { user = null } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider value={{ user, signOut: vi.fn() }}>
        <Navbar />
        <LocationProbe />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

const input = () => screen.getByRole('textbox', { name: /search gadgets/i })
const currentUrl = () => screen.getByTestId('location').textContent

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Navbar search', () => {
  it('keeps every typed character and writes ?q= only after typing pauses', () => {
    renderNavbar()
    const typed = 'best camera?'
    for (let i = 1; i <= typed.length; i += 1) {
      fireEvent.change(input(), { target: { value: typed.slice(0, i) } })
      act(() => vi.advanceTimersByTime(40))
    }
    expect(input().value).toBe('best camera?')
    expect(currentUrl()).toBe('/')

    act(() => vi.advanceTimersByTime(250))
    expect(currentUrl()).toBe('/?q=best+camera%3F')
    expect(input().value).toBe('best camera?')
    // 12 renders with fake timers: 5 s timed out on slower laptops (Mika's review on #139).
  }, 15000)

  it('writes ?q= at once when the input loses focus', () => {
    renderNavbar()
    fireEvent.change(input(), { target: { value: 'pixel' } })
    fireEvent.blur(input())
    expect(currentUrl()).toBe('/?q=pixel')
  })

  it('turns the text into a question on Enter and clears the box', () => {
    renderNavbar('/?q=old&sort=name', { user: MEMBER })
    fireEvent.change(input(), { target: { value: 'which has the best battery' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(currentUrl()).toBe('/?sort=name&ask=which+has+the+best+battery')
    expect(input().value).toBe('')
    act(() => vi.advanceTimersByTime(500))
    expect(currentUrl()).toBe('/?sort=name&ask=which+has+the+best+battery')
  })

  it('sends an anonymous Ask to /login, keeping the question out of the URL', () => {
    renderNavbar('/?q=old&sort=name')
    fireEvent.change(input(), { target: { value: 'which has the best battery' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(currentUrl()).toBe('/login')
    const state = JSON.parse(screen.getByTestId('state').textContent)
    // Returns to the catalog the user was on, minus the question and the box's ?q=.
    expect(state.from).toMatchObject({ pathname: '/', search: '?sort=name' })
    expect(screen.getByTestId('state').textContent).not.toMatch(/battery/)
    act(() => vi.advanceTimersByTime(500))
    expect(currentUrl()).toBe('/login')
  })

  it('sends an anonymous click on the Ask button to /login too', () => {
    renderNavbar('/compare')
    fireEvent.change(input(), { target: { value: 'best camera' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask the AI' }))
    expect(currentUrl()).toBe('/login')
    expect(JSON.parse(screen.getByTestId('state').textContent).from).toMatchObject({ pathname: '/compare', search: '' })
  })

  it('keeps plain name search available without an account', () => {
    renderNavbar()
    fireEvent.change(input(), { target: { value: 'pixel' } })
    act(() => vi.advanceTimersByTime(250))
    expect(currentUrl()).toBe('/?q=pixel')
  })

  it('shows a ?q= change made elsewhere, such as back/forward or Clear filters', () => {
    renderNavbar('/?q=tab')
    expect(input().value).toBe('tab')
    fireEvent.click(screen.getByRole('button', { name: 'external q' }))
    expect(input().value).toBe('phone')
    fireEvent.click(screen.getByRole('button', { name: 'external clear' }))
    expect(input().value).toBe('')
  })

  it('does not echo its own debounced write back over newer typing', () => {
    renderNavbar()
    fireEvent.change(input(), { target: { value: 'ip' } })
    act(() => vi.advanceTimersByTime(250))
    expect(currentUrl()).toBe('/?q=ip')
    fireEvent.change(input(), { target: { value: 'iph' } })
    expect(input().value).toBe('iph')
    act(() => vi.advanceTimersByTime(250))
    expect(currentUrl()).toBe('/?q=iph')
  })

  it('navigates to the catalog when typing on another page', () => {
    renderNavbar('/compare')
    fireEvent.change(input(), { target: { value: 'tab' } })
    expect(currentUrl()).toBe('/compare')
    act(() => vi.advanceTimersByTime(250))
    expect(currentUrl()).toBe('/?q=tab')
    expect(input().value).toBe('tab')
  })

  it('keeps the 150-character limit and the "/" focus shortcut', () => {
    renderNavbar()
    expect(input().maxLength).toBe(150)
    fireEvent.keyDown(window, { key: '/' })
    expect(document.activeElement).toBe(input())
  })
})
