import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import CorrectionDiff from './CorrectionDiff'

afterEach(cleanup)

describe('CorrectionDiff', () => {
  it('marks removed words with <del> and added words with <ins>, labelled for screen readers', () => {
    const { container } = render(<CorrectionDiff current="Battery: 4500 mAh" suggested="Battery: 4700 mAh" />)
    const del = container.querySelector('del')
    const ins = container.querySelector('ins')
    expect(del?.textContent).toBe('[deletion start] 4500 [deletion end]')
    expect(ins?.textContent).toBe('[insertion start] 4700 [insertion end]')
    expect(del?.querySelectorAll('.sr-only')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Current' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Suggested' })).toBeTruthy()
    expect(screen.getByText(/struck through/)).toBeTruthy()
  })

  it('says so when the suggestion has the same words', () => {
    const { container } = render(<CorrectionDiff current="Weight: 187 g" suggested="Weight:  187 g" />)
    expect(container.querySelector('del, ins')).toBeNull()
    expect(screen.getByText(/same words/)).toBeTruthy()
  })

  it('copes with a missing current text', () => {
    const { container } = render(<CorrectionDiff current={undefined} suggested="New spec" />)
    expect(container.querySelector('ins')?.textContent).toContain('New spec')
  })
})
