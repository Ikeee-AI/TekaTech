import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useRouteFocus } from './useRouteFocus'

afterEach(cleanup)

function Page({ pathname, withInput = false }) {
  useRouteFocus(pathname, 'main-content')
  return (
    <>
      {withInput && <input aria-label="search" />}
      <button type="button">old page button</button>
      <main id="main-content" tabIndex={-1}>
        content
      </main>
    </>
  )
}

describe('useRouteFocus', () => {
  it('leaves focus alone on the first page load', () => {
    render(<Page pathname="/" />)
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus to <main> after the path changes', () => {
    const { rerender, getByRole } = render(<Page pathname="/" />)
    getByRole('button').focus()
    rerender(<Page pathname="/compare" />)
    expect(document.activeElement?.id).toBe('main-content')
  })

  it('does not steal focus from a text field (navbar search moving to the catalog)', () => {
    const { rerender, getByRole } = render(<Page pathname="/compare" withInput />)
    const input = getByRole('textbox')
    input.focus()
    rerender(<Page pathname="/" withInput />)
    expect(document.activeElement).toBe(input)
  })

  it('does nothing when only the query string changes (same path)', () => {
    const { rerender, getByRole } = render(<Page pathname="/" />)
    const button = getByRole('button')
    button.focus()
    rerender(<Page pathname="/" />)
    expect(document.activeElement).toBe(button)
  })
})
