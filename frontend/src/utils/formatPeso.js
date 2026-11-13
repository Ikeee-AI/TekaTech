// Philippine peso, the way shoppers read it: "₱50,990" (rebrand brief: ₱, not "Php").
const PESO = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 })

export function formatPeso(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return `₱${PESO.format(Math.round(Number(value)))}`
}
