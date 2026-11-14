// Client-side checks for the admin photo upload (#202). The same limits as the API
// (backend/image_upload.py): the server is the real check (it reads the file's magic bytes),
// these only spare the admin a round trip for an obviously wrong file.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',')

export const UPLOAD_TOO_LARGE = 'The photo is larger than 2 MB. Choose a smaller file.'
export const UPLOAD_WRONG_TYPE = 'Choose a JPEG, PNG, WebP or AVIF photo.'
export const UPLOAD_SVG = "SVG images aren't accepted (they can contain scripts). Choose a JPEG, PNG, WebP or AVIF photo."
export const UPLOAD_EMPTY = 'The file is empty.'

// Used only when the browser reports no type (some report "" for .avif).
const EXTENSION_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }

/** An error message for a file the API would refuse, or null when it looks fine. */
export function validateImageFile(file) {
  if (!file) return UPLOAD_WRONG_TYPE
  const name = file.name || ''
  let type = (file.type || '').toLowerCase()
  if (type === 'image/svg+xml' || /\.svgz?$/i.test(name)) return UPLOAD_SVG
  // No reported type: go by the extension. The API's magic-byte check is still the real check.
  if (!type) type = EXTENSION_TYPES[name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]] ?? ''
  if (!ALLOWED_IMAGE_TYPES.includes(type)) return UPLOAD_WRONG_TYPE
  if (file.size === 0) return UPLOAD_EMPTY
  if (file.size > MAX_IMAGE_BYTES) return UPLOAD_TOO_LARGE
  return null
}

/** "1.4 MB" / "320 KB", for the selected file's description. */
export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
