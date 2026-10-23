/** Plain-language message for a failed API request, based on the HTTP status. */
export function friendlyError(err) {
  if (!err?.status) return "Can't reach the server. Check your connection, then try again."
  if (err.status === 401) return 'Your session has expired. Log in again, then try again.'
  if (err.status === 429) return 'Too many requests. Wait a minute, then try again.'
  if (err.status === 503) return err.message || 'The AI service is unavailable right now. Try again shortly.'
  if (err.status >= 500) return 'Something went wrong on the server. Try again.'
  return err.message
}