/** Plain-language message for a failed delete, based on the HTTP status. */
export function deleteErrorMessage(err, kind) {
  if (err.status === 401) return `Log in first, then try deleting this ${kind} again.`
  if (err.status === 403) {
    return `The server refused: your account isn't allowed to delete ${kind}s. Right now only admin accounts can.`
  }
  if (kind === 'spec' && (err.status === 404 || err.status === 405)) {
    return "The server doesn't support deleting specs yet, so nothing was removed."
  }
  if (err.status === 404) return `This ${kind} was already deleted or no longer exists.`
  return err.message || `The ${kind} could not be deleted. Please try again.`
}
