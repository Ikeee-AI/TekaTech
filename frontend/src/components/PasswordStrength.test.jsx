import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PasswordStrength from './PasswordStrength'

afterEach(cleanup)

const filledSegments = (container) => container.querySelectorAll('[data-filled="true"]').length
const metRules = (container) => [...container.querySelectorAll('[data-met="true"]')].map((li) => li.dataset.rule)

describe('PasswordStrength', () => {
  it('shows the rules but no label before anything is typed', () => {
    const { container } = render(<PasswordStrength password="" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(filledSegments(container)).toBe(0)
    expect(screen.queryByText(/too weak/i)).toBeNull()
  })

  it.each([
    ['a', 'Too weak', 0],
    ['abc1', 'Weak', 1],
    ['Abcdefg1', 'Fair', 2],
    ['Abcdef1!', 'Good', 3],
    ['Abcdefghij1!', 'Strong', 4],
  ])('%j reads %s with %i filled segments', (password, label, segments) => {
    const { container } = render(<PasswordStrength password={password} />)
    expect(screen.getByText(label)).toBeTruthy()
    expect(filledSegments(container)).toBe(segments)
  })

  it('marks each rule met or not met in text, not colour alone', () => {
    const { container } = render(<PasswordStrength password="abcdefgh" />)
    expect(metRules(container)).toEqual(['length', 'lower'])
    expect(container.querySelector('[data-rule="length"]').textContent).toBe('At least 8 characters (met)')
    expect(container.querySelector('[data-rule="number"]').textContent).toBe('A number (0–9) (not met)')
    expect(container.querySelectorAll('[data-met] svg')).toHaveLength(5)
  })

  it('announces only the label', () => {
    const { container } = render(<PasswordStrength password="Abcdef1!" />)
    const live = container.querySelectorAll('[aria-live]')
    expect(live).toHaveLength(1)
    expect(live[0].textContent).toBe('Password strength: Good')
  })
})
