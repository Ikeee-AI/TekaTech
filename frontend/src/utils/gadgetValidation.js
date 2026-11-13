export const GADGET_FIELD_LABELS = {
  name: 'Name',
  brand: 'Brand',
  category: 'Category',
  release_date: 'Release Date',
  price_php: 'Price (Php)',
  image_url: 'Image URL',
  price_source_url: 'Price Source URL',
  price_checked_at: 'Price Checked On',
  store_url: 'Official Store Link',
}

export const EMPTY_GADGET = {
  name: '', brand: '', category: '', release_date: '', price_php: '', image_url: '',
  price_source_url: '', price_checked_at: '', store_url: '',
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']

/**
 * True when the link names an image file: the path ends in an image extension
 * (`…/poco-x7.png`), or a CDN query asks for an image format (`?fmt=jpeg`, `format=webp`).
 * Only a hint: the form's live preview is the real check (#202).
 */
export function looksLikeImageUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  const ext = url.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (ext && IMAGE_EXTENSIONS.includes(ext)) return true
  for (const key of ['fmt', 'format']) {
    if (IMAGE_EXTENSIONS.includes(url.searchParams.get(key)?.toLowerCase())) return true
  }
  return false
}

export const IMAGE_LINK_FAILED =
  "This link didn't load as an image (it may be a web page). Use a direct image link, or leave it empty."
export const IMAGE_LINK_UNCHECKED =
  "This doesn't look like a direct image link (.jpg, .png, .webp, .avif). Wait for the preview to load, or use another link."

/**
 * Returns { field: message } for every invalid field; an empty object means valid.
 * `imageStatus` is the form's live preview result for the current image link:
 * 'loaded', 'failed' or 'pending' (still loading, or no preview yet).
 */
export function validateGadget(form, { imageStatus = 'pending' } = {}) {
  const errors = {}
  const name = form.name.trim()
  const brand = form.brand.trim()
  const category = form.category.trim()

  if (!name) errors.name = 'Enter the gadget name.'
  else if (name.length > 120) errors.name = 'Keep the name under 120 characters.'

  if (!brand) errors.brand = 'Enter the brand.'
  else if (brand.length > 80) errors.brand = 'Keep the brand under 80 characters.'

  if (!category) errors.category = 'Enter a category, like Smartphone or Laptop.'
  else if (category.length > 60) errors.category = 'Keep the category under 60 characters.'

  if (form.release_date) {
    const year = Number(form.release_date.slice(0, 4))
    if (Number.isNaN(new Date(form.release_date).getTime()) || year < 1970 || year > 2100) {
      errors.release_date = 'Enter a real date (year 1970–2100).'
    }
  }

  if (form.price_php !== '' && form.price_php != null) {
    const price = Number(form.price_php)
    if (Number.isNaN(price)) errors.price_php = 'Enter the price as a number, like 24999.'
    else if (price < 0) errors.price_php = 'Price can’t be negative.'
    else if (price > 10_000_000) errors.price_php = 'That price looks too high — check for extra zeros.'
  }

  const imageUrl = form.image_url.trim()
  if (imageUrl && !isHttpUrl(imageUrl)) {
    errors.image_url = 'Enter a full link starting with http:// or https://.'
  } else if (imageUrl && imageStatus === 'failed') {
    // The browser couldn't show it, so the catalog card couldn't either (Poco's link returns a web page).
    errors.image_url = IMAGE_LINK_FAILED
  } else if (imageUrl && imageStatus !== 'loaded' && !looksLikeImageUrl(imageUrl)) {
    // A link without an image extension is fine once the preview has loaded it.
    errors.image_url = IMAGE_LINK_UNCHECKED
  }

  // Sourced prices (14 Nov 2026): both links are shown as clickable hrefs, so http(s) only.
  for (const field of ['price_source_url', 'store_url']) {
    const value = (form[field] ?? '').trim()
    if (value && !isHttpUrl(value)) errors[field] = 'Enter a full link starting with http:// or https://.'
  }
  if (form.price_checked_at) {
    const checked = new Date(form.price_checked_at)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (Number.isNaN(checked.getTime()) || Number(form.price_checked_at.slice(0, 4)) < 1970 || checked > tomorrow) {
      errors.price_checked_at = 'Enter the day you checked the price (not a future date).'
    }
  }

  return errors
}

const OPTIONAL_FIELDS = ['release_date', 'price_php', 'image_url', 'price_source_url', 'price_checked_at', 'store_url']

/**
 * Turns form strings into the API payload; blank optional fields are left out.
 * On edit, pass the form's starting values: an optional field the user emptied
 * is sent as an explicit `null`, which tells PATCH to clear it. Fields that were
 * already blank stay left out (unchanged).
 */
export function toGadgetPayload(form, initialValues = null) {
  const payload = {
    name: form.name.trim(),
    brand: form.brand.trim(),
    category: form.category.trim(),
    release_date: form.release_date || undefined,
    price_php: form.price_php !== '' && form.price_php != null ? Number(form.price_php) : undefined,
    image_url: form.image_url.trim() || undefined,
    price_source_url: (form.price_source_url ?? '').trim() || undefined,
    price_checked_at: form.price_checked_at || undefined,
    store_url: (form.store_url ?? '').trim() || undefined,
  }
  if (initialValues) {
    for (const field of OPTIONAL_FIELDS) {
      const hadValue = String(initialValues[field] ?? '').trim() !== ''
      if (payload[field] === undefined && hadValue) payload[field] = null
    }
  }
  return payload
}
