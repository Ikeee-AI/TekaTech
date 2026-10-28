import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import FollowUpQuestions from './FollowUpQuestions'

afterEach(cleanup)

const QUESTIONS = ['Which has the better display?', 'Which charges faster?']

describe('FollowUpQuestions', () => {
  it('renders a labelled group with one button per question', () => {
    render(<FollowUpQuestions questions={QUESTIONS} onSelect={() => {}} />)
    const group = screen.getByRole('group', { name: 'Suggested Follow-Up Questions' })
    const buttons = group.querySelectorAll('button')
    expect([...buttons].map((b) => b.textContent)).toEqual(QUESTIONS)
  })

  it('passes the chosen question to onSelect', () => {
    const onSelect = vi.fn()
    render(<FollowUpQuestions questions={QUESTIONS} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Which charges faster?' }))
    expect(onSelect).toHaveBeenCalledWith('Which charges faster?')
  })

  it('disables the buttons while a question is being answered', () => {
    const onSelect = vi.fn()
    render(<FollowUpQuestions questions={QUESTIONS} onSelect={onSelect} disabled />)
    const button = screen.getByRole('button', { name: 'Which charges faster?' })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders nothing without questions or a handler', () => {
    const { container: empty } = render(<FollowUpQuestions questions={[]} onSelect={() => {}} />)
    expect(empty.innerHTML).toBe('')
    const { container: noHandler } = render(<FollowUpQuestions questions={QUESTIONS} />)
    expect(noHandler.innerHTML).toBe('')
  })
})
