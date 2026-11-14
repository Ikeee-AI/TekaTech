import { describe, expect, it } from 'vitest'
import { friendlyError } from './requestErrors'

function failure(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

describe('friendlyError', () => {
  it('shows the daily AI limit message as the server wrote it', () => {
    const msg = "You've used today's 20 AI questions. They reset at 8:00 AM (Manila time)."
    expect(friendlyError(failure(429, msg))).toBe(msg)
  })

  it('keeps the generic text for the per-minute limit', () => {
    expect(friendlyError(failure(429, 'Too Many Requests'))).toBe('Too many requests. Wait a minute, then try again.')
  })
})
