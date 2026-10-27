/**
 * "Brand Name" for prose such as AI questions, without doubling the brand when
 * the name already includes it ("Infinix" + "Infinix Note 40" -> "Infinix Note 40").
 */
export function gadgetDisplayName(gadget) {
  const name = (gadget?.name ?? '').trim()
  const brand = (gadget?.brand ?? '').trim()
  if (!brand) return name
  if (!name) return brand
  const lowerName = name.toLowerCase()
  const lowerBrand = brand.toLowerCase()
  // Whole-word prefix only, so brand "LG" still prefixes a name like "LGX Pad".
  const next = lowerName.charAt(lowerBrand.length)
  if (lowerName.startsWith(lowerBrand) && (next === '' || !/[a-z0-9]/i.test(next))) return name
  return `${brand} ${name}`
}
