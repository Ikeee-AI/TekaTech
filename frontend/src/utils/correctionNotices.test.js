import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CORRECTIONS_CHANGED_EVENT,
  getSeenUntil,
  markDecisionsSeen,
  unseenDecisions,
} from './correctionNotices'

const approved = (reviewed_at) => ({ status: 'approved', reviewed_at })
const rejected = (reviewed_at) => ({ status: 'rejected', reviewed_at })
const pending = () => ({ status: 'pending', reviewed_at: null })

let changed
const onChanged = () => { changed += 1 }

beforeEach(() => {
  localStorage.clear()
  changed = 0
  window.addEventListener(CORRECTIONS_CHANGED_EVENT, onChanged)
})

afterEach(() => {
  window.removeEventListener(CORRECTIONS_CHANGED_EVENT, onChanged)
  vi.restoreAllMocks()
})

describe('unseenDecisions', () => {
  const items = [
    approved('2026-10-20T10:00:00Z'),
    rejected('2026-10-22T10:00:00Z'),
    pending(),
    { status: 'approved', reviewed_at: 'garbage' },
  ]

  it('returns every decided item when nothing has been seen yet', () => {
    expect(unseenDecisions(items, null)).toEqual(items.slice(0, 2))
  })

  it('returns only decisions reviewed strictly after the seen marker', () => {
    expect(unseenDecisions(items, '2026-10-20T10:00:00Z')).toEqual([items[1]])
    expect(unseenDecisions(items, '2026-10-22T10:00:00Z')).toEqual([])
  })

  it('compares instants, not strings, across time-zone offsets', () => {
    // 18:30+08:00 is 10:30Z, after the approval at 10:00Z.
    expect(unseenDecisions([approved('2026-10-20T18:30:00+08:00')], '2026-10-20T10:00:00Z')).toHaveLength(1)
  })

  it('treats an unreadable seen marker as "nothing seen"', () => {
    expect(unseenDecisions(items, 'not a date')).toHaveLength(2)
  })
})

describe('markDecisionsSeen / getSeenUntil', () => {
  it('stores the newest server reviewed_at and announces the change', () => {
    markDecisionsSeen('user-1', [approved('2026-10-20T10:00:00Z'), rejected('2026-10-22T10:00:00Z'), pending()])
    expect(getSeenUntil('user-1')).toBe('2026-10-22T10:00:00Z')
    expect(changed).toBe(1)
  })

  it('never moves the marker backwards and stays quiet when nothing is newer', () => {
    markDecisionsSeen('user-1', [approved('2026-10-22T10:00:00Z')])
    markDecisionsSeen('user-1', [approved('2026-10-20T10:00:00Z')])
    markDecisionsSeen('user-1', [approved('2026-10-22T10:00:00Z')])
    expect(getSeenUntil('user-1')).toBe('2026-10-22T10:00:00Z')
    expect(changed).toBe(1)
  })

  it('does nothing when there are no decided items', () => {
    markDecisionsSeen('user-1', [pending()])
    expect(getSeenUntil('user-1')).toBeNull()
    expect(changed).toBe(0)
  })

  it('keeps separate markers per user on the same browser', () => {
    markDecisionsSeen('user-1', [approved('2026-10-22T10:00:00Z')])
    expect(getSeenUntil('user-2')).toBeNull()
  })

  it('ignores a missing user id', () => {
    markDecisionsSeen(null, [approved('2026-10-22T10:00:00Z')])
    expect(getSeenUntil(null)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('degrades to "nothing seen" when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    expect(getSeenUntil('user-1')).toBeNull()
    expect(() => markDecisionsSeen('user-1', [approved('2026-10-22T10:00:00Z')])).not.toThrow()
  })
})
