import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RouteErrorBoundary from './RouteErrorBoundary'
import { AUTO_RELOAD_KEY } from '../utils/chunkErrors'

function Throws({ error }) {
  throw error
}

let consoleError

beforeEach(() => {
  sessionStorage.clear()
  // React logs caught render errors; keep the test output readable.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  consoleError.mockRestore()
})

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: /assets/Login-old.js')

describe('RouteErrorBoundary', () => {
  it('renders its children when nothing fails', () => {
    render(
      <RouteErrorBoundary>
        <p>Catalog</p>
      </RouteErrorBoundary>,
    )
    expect(screen.getByText('Catalog')).toBeTruthy()
  })

  it('reloads once automatically when a page chunk is missing after a deploy', () => {
    const onReload = vi.fn()
    render(
      <RouteErrorBoundary onReload={onReload}>
        <Throws error={chunkError()} />
      </RouteErrorBoundary>,
    )
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toMatch(/updated/i)
  })

  it('shows the update message with a Reload button when the auto-reload was just used', () => {
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()))
    const onReload = vi.fn()
    render(
      <RouteErrorBoundary onReload={onReload}>
        <Throws error={chunkError()} />
      </RouteErrorBoundary>,
    )
    expect(onReload).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/TekaTech was updated/)
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('shows a generic message without error details for other render errors', () => {
    const onReload = vi.fn()
    render(
      <RouteErrorBoundary onReload={onReload}>
        <Throws error={new Error('secret stack detail')} />
      </RouteErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/Something went wrong/)
    expect(alert.textContent).not.toMatch(/secret stack detail/)
    expect(screen.getByRole('link', { name: 'Back to catalog' }).getAttribute('href')).toBe('/')
    expect(onReload).not.toHaveBeenCalled()
  })
})
