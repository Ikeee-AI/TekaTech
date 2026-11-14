// Sourced prices (14 Nov 2026): labels for where a price came from and when it was checked.
import { isHttpUrl } from './gadgetValidation'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "https://www.samsung.com/ph/smartphones/…" -> "samsung.com/ph": the site plus a country path. */
export function priceSourceLabel(url) {
  if (!isHttpUrl(url ?? '')) return null
  const { hostname, pathname } = new URL(url)
  const host = hostname.replace(/^www\./i, '')
  const first = pathname.split('/').filter(Boolean)[0]
  return first && /^[a-z]{2}(-[a-z]{2})?$/i.test(first) ? `${host}/${first.toLowerCase()}` : host
}

/** "2026-11-14" -> "14 Nov", with the year added when it isn't this year. Read as a calendar date, not UTC. */
export function formatCheckedDate(value, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return null
  const [, year, month, day] = match
  const label = `${Number(day)} ${MONTHS[Number(month) - 1]}`
  return Number(year) === today.getFullYear() ? label : `${label} ${year}`
}
