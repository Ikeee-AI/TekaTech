function startsWithWord(text, word) {
  const lowerText = text.toLowerCase()
  const lowerWord = word.toLowerCase()
  // Whole-word prefix only, so brand "LG" still prefixes a name like "LGX Pad".
  const next = lowerText.charAt(lowerWord.length)
  return lowerText.startsWith(lowerWord) && (next === '' || !/[a-z0-9]/i.test(next))
}

/**
 * The name without a doubled brand: catalog rows sometimes store the brand inside the
 * name too, and older saved questions read "Infinix Infinix Note 40". Collapses a word
 * repeated straight after itself at the start ("Infinix Infinix Note 40" -> "Infinix Note 40").
 */
export function withoutDoubledBrand(name) {
  const text = (name ?? '').trim()
  const match = text.match(/^(\S+)\s+(\S+)(?=\s|$)/)
  if (match && match[1].toLowerCase() === match[2].toLowerCase()) return text.slice(match[1].length).trim()
  return text
}

/**
 * "Brand Name" for prose such as AI questions, without doubling the brand when
 * the name already includes it ("Infinix" + "Infinix Note 40" -> "Infinix Note 40").
 */
export function gadgetDisplayName(gadget) {
  const name = withoutDoubledBrand(gadget?.name)
  const brand = (gadget?.brand ?? '').trim()
  if (!brand) return name
  if (!name) return brand
  if (startsWithWord(name, brand)) return name
  return `${brand} ${name}`
}

/**
 * Display text for a saved question: any capitalised word written twice in a row
 * ("the Infinix Infinix Note 40") is shown once. The stored question is unchanged.
 */
export function questionDisplayText(question) {
  return (question ?? '').replace(/\b([A-Z][\w-]*)\s+\1\b/g, '$1')
}
