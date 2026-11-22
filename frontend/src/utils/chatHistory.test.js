import { describe, expect, it } from 'vitest'
import { HISTORY_TURNS, historyForRequest } from './chatHistory'

const turn = (question, answer) => ({ question, result: answer === null ? null : { answer } })

describe('historyForRequest', () => {
  it('keeps the newest answered turns, oldest first', () => {
    const turns = [turn('a', '1'), turn('b', null), turn('c', '3'), turn('d', '4'), turn('e', '5')]
    expect(historyForRequest(turns)).toEqual([
      { question: 'c', answer: '3' },
      { question: 'd', answer: '4' },
      { question: 'e', answer: '5' },
    ])
    expect(HISTORY_TURNS).toBe(3)
  })

  it('is empty for a fresh chat', () => {
    expect(historyForRequest([])).toEqual([])
  })
})
