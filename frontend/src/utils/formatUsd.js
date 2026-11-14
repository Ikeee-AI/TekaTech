// Admin overview (#206): AI spend is fractions of a cent per question, so small amounts keep four decimals.
export function formatUsd(value) {
  if (value == null) return '—'
  return `$${value.toFixed(value < 1 ? 4 : 2)}`
}
