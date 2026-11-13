import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH as REEXPORTED } from './authErrors'
import { checkPassword, MIN_PASSWORD_LENGTH, passwordError, PASSWORD_RULES } from './passwordStrength'

const metIds = (pw) => checkPassword(pw).rules.filter((r) => r.met).map((r) => r.id)

describe('password rules', () => {
  it('has the five rules, with 8 as the minimum length (also exported from authErrors)', () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(['length', 'lower', 'upper', 'number', 'symbol'])
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(REEXPORTED).toBe(8)
  })

  it.each([
    ['', []],
    ['abcdefgh', ['length', 'lower']],
    ['ABC', ['upper']],
    ['1234', ['number']],
    ['!', ['symbol']],
    ['Abcdef1!', ['length', 'lower', 'upper', 'number', 'symbol']],
  ])('%j meets %j', (pw, ids) => {
    expect(metIds(pw)).toEqual(ids)
  })

  it('counts only the symbols Supabase counts', () => {
    for (const ch of '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~') expect(metIds(ch)).toContain('symbol')
    expect(metIds(' ')).not.toContain('symbol')
    expect(metIds('é')).toEqual([])
  })
})

describe('checkPassword score', () => {
  it.each([
    ['', 0, 'Too weak'],
    ['a', 0, 'Too weak'],
    ['abc1', 1, 'Weak'],
    ['abcdefg1', 1, 'Weak'],
    ['Abcdefg1', 2, 'Fair'],
    ['Abcdef1!', 3, 'Good'],
    ['Abcdefghij1!', 4, 'Strong'],
    // Long but missing rules never reads as Good.
    ['abcdefghijklmnop', 1, 'Weak'],
  ])('%j → %i %s', (pw, score, label) => {
    const result = checkPassword(pw)
    expect(result.score).toBe(score)
    expect(result.label).toBe(label)
    expect(result.valid).toBe(score >= 3)
  })
})

describe('passwordError', () => {
  it('is null once every rule passes', () => {
    expect(passwordError('Abcdef1!')).toBeNull()
  })

  it('names exactly what is missing', () => {
    expect(passwordError('abcdefgh')).toBe('Make it stronger: add an uppercase letter, add a number and add a symbol such as ! or #.')
    expect(passwordError('Abcdef1')).toBe('Make it stronger: use at least 8 characters and add a symbol such as ! or #.')
    expect(passwordError('')).toBe('Enter a password.')
  })
})
