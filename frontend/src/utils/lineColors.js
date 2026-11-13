// "Rail wayfinding" line colours (docs/design/rebrand-brief.md): a colour always means
// something. Here: a catalog category, or a gadget's slot in a comparison.
// Class names are written out in full so Tailwind can see them.
import { categoryKey } from './followUps'

const CATEGORY_LINES = {
  phone: { dot: 'bg-line-blue', text: 'text-line-blue', name: 'blue' },
  laptop: { dot: 'bg-line-purple', text: 'text-line-purple', name: 'purple' },
  headphones: { dot: 'bg-line-orange', text: 'text-line-orange', name: 'orange' },
  handheld: { dot: 'bg-line-green', text: 'text-line-green', name: 'green' },
  generic: { dot: 'bg-line-teal', text: 'text-line-teal', name: 'teal' },
}

/** Line colour for a free-text category ("Smartphone", "Laptop"…), via the same word matching as follow-ups. */
export function categoryLine(category) {
  return CATEGORY_LINES[categoryKey(category)]
}

// Compared gadgets get one line each, in this order (up to five, the My Gadgets maximum).
const COMPARE_LINES = [
  { dot: 'bg-line-yellow', name: 'yellow' },
  { dot: 'bg-line-green', name: 'green' },
  { dot: 'bg-line-blue', name: 'blue' },
  { dot: 'bg-line-purple', name: 'purple' },
  { dot: 'bg-line-orange', name: 'orange' },
]

/** Line colour for the gadget in position `index` of a comparison. */
export function compareLine(index) {
  return COMPARE_LINES[index % COMPARE_LINES.length]
}
