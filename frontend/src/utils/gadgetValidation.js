export const GADGET_FIELD_LABELS = {
  name: 'Name',
  brand: 'Brand',
  category: 'Category',
  release_date: 'Release Date',
  price_php: 'Price (Php)',
  image_url: 'Image URL',
}

export const EMPTY_GADGET = { name: '', brand: '', category: '', release_date: '', price_php: '', image_url: '' }

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Returns { field: message } for every invalid field; an empty object means valid. */
export function validateGadget(form) {
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

  if (form.image_url.trim() && !isHttpUrl(form.image_url.trim())) {
    errors.image_url = 'Enter a full link starting with http:// or https://.'
  }

  return errors
}

const OPTIONAL_FIELDS = ['release_date', 'price_php', 'image_url']

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
  }
  if (initialValues) {
    for (const field of OPTIONAL_FIELDS) {
      const hadValue = String(initialValues[field] ?? '').trim() !== ''
      if (payload[field] === undefined && hadValue) payload[field] = null
    }
  }
  return payload
}
