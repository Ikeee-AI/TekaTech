// #196 item 4: the page a user signed up from survives until the confirmation link, but only
// as a same-site path, once, and for at most 24 hours.
import { afterEach, describe, expect, it } from 'vitest'
import { safePath, saveReturnPath, takeReturnPath } from './returnPath'

const NOW = 1_800_000_000_000
const HOUR = 60 * 60 * 1000

afterEach(() => window.localStorage.clear())

describe('safePath', () => {
  it('keeps a same-site path with its query and hash', () => {
    expect(safePath('/compare?ids=a,b#ai')).toBe('/compare?ids=a,b#ai')
  })

  it.each([
    ['another site', 'https://evil.example/x'],
    ['a protocol-relative link', '//evil.example/x'],
    ['a backslash trick', '/\\evil.example'],
    ['a relative path', 'gadgets/1'],
    ['a script URL', 'javascript:alert(1)'],
    ['the log-in page', '/login?mode=signup'],
    ['the reset page', '/reset-password'],
    ['nothing', null],
  ])('rejects %s', (_label, path) => {
    expect(safePath(path)).toBeNull()
  })
})

describe('saveReturnPath / takeReturnPath', () => {
  it('returns a saved router location once, then forgets it', () => {
    saveReturnPath({ pathname: '/gadgets/42', search: '?ask=chip', hash: '' }, NOW)
    expect(takeReturnPath(NOW + HOUR)).toBe('/gadgets/42?ask=chip')
    expect(takeReturnPath(NOW + HOUR)).toBeNull()
  })

  it('ignores a path saved more than 24 hours ago', () => {
    saveReturnPath('/my-gadgets', NOW)
    expect(takeReturnPath(NOW + 25 * HOUR)).toBeNull()
  })

  it('does not save an unsafe path', () => {
    saveReturnPath('//evil.example', NOW)
    expect(window.localStorage.length).toBe(0)
  })

  it('ignores a stored value that was tampered with', () => {
    window.localStorage.setItem('tekatech.returnAfterConfirm', JSON.stringify({ path: 'https://evil.example', savedAt: NOW }))
    expect(takeReturnPath(NOW)).toBeNull()
    window.localStorage.setItem('tekatech.returnAfterConfirm', 'not json')
    expect(takeReturnPath(NOW)).toBeNull()
  })
})
