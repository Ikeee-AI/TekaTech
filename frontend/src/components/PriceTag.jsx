import { formatPeso } from '../utils/formatPeso'
import { formatCheckedDate, priceSourceLabel } from '../utils/priceSource'

/**
 * A gadget's price with where it came from (sourced prices, 14 Nov 2026): "₱49,990" and below it a
 * small "samsung.com/ph · checked 14 Nov" link to the official page. A price without a source still
 * shows, labelled "source not given". Renders only inline elements, so it fits inside a <p> or <dd>;
 * the caller keeps its own price styling. `empty` is what to show when there is no price at all;
 * `sourceClassName` sets the source line's colour (muted grey by default, e.g. 'opacity-85' on a coloured card).
 */
export default function PriceTag({ gadget, empty = null, sourceClassName = 'text-slate-500' }) {
  const price = formatPeso(gadget?.price_php)
  if (!price) return empty
  const site = priceSourceLabel(gadget.price_source_url)
  const checked = formatCheckedDate(gadget.price_checked_at)
  const lineClass = `block mt-0.5 font-sans text-xs font-normal ${sourceClassName}`
  return (
    <>
      {price}
      {site ? (
        <span className={lineClass}>
          <a
            href={gadget.price_source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-current/40 underline-offset-2 hover:decoration-current rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            {site}
            {checked ? ` · checked ${checked}` : ''}
            <span className="sr-only"> (price source, opens in a new tab)</span>
          </a>
        </span>
      ) : (
        <span className={lineClass}>source not given</span>
      )}
    </>
  )
}
