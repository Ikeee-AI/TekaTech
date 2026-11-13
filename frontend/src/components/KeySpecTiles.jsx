import { KEY_SPECS } from '../utils/keySpecs'

// Tile colours follow the theme tokens: dark = lime, white, dark card, cobalt;
// light = cobalt, ink, white, pale lime (rebrand canvas, 13 Nov 2026).
const TILE_STYLES = [
  'bg-sage-700 text-white border-sage-700',
  'bg-inverse text-inverse-ink border-inverse',
  'bg-white text-slate-900 border-slate-200',
  'bg-pop text-pop-ink border-pop',
]

/**
 * The four key-spec tiles (RAM, storage, main camera, display Hz).
 * keySpecs comes from extractKeySpecs(); a missing value says "Not stated by source".
 * size "lg" is the catalog hero, "md" the gadget page and compare.
 */
export default function KeySpecTiles({ keySpecs, gadgetName, size = 'md', loading = false, className = '' }) {
  const big = size === 'lg'
  return (
    <ul
      aria-label={gadgetName ? `${gadgetName} key specs` : 'Key specs'}
      className={`grid grid-cols-2 gap-3 ${className}`}
    >
      {KEY_SPECS.map((spec, i) => {
        const found = keySpecs?.[spec.id]
        return (
          <li
            key={spec.id}
            className={`flex flex-col justify-between gap-2 rounded-[26px] border ${big ? 'p-5 min-h-[168px]' : 'p-4 min-h-[124px]'} ${TILE_STYLES[i]}`}
          >
            <p className="text-sm font-bold">{gadgetName && big ? `${gadgetName} · ${spec.label}` : spec.label}</p>
            {loading ? (
              <p className="h-10 w-24 rounded-xl bg-current opacity-15 animate-pulse" aria-label="Loading" />
            ) : found ? (
              <p className={`font-extrabold tracking-[-0.05em] leading-[0.9] ${big ? 'text-5xl' : 'text-4xl'}`}>
                {found.value}
                {found.unit && <span className={`tracking-normal ${big ? 'text-xl' : 'text-lg'}`}> {found.unit}</span>}
              </p>
            ) : (
              <p className="text-base font-semibold opacity-80">Not stated by source</p>
            )}
            <p className="text-xs opacity-80 truncate">{found?.source ?? ' '}</p>
          </li>
        )
      })}
    </ul>
  )
}
