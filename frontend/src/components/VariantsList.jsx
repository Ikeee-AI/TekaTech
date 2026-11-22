import { formatGb } from '../utils/keySpecs'

/**
 * Every RAM/storage variant the phone's sources list (phone page). The key-spec tiles show the
 * standard (base) model only (owner, 13 Nov 2026); this is where shoppers see the rest.
 * variants comes from extractVariants(); render nothing when there is a single variant.
 */
export default function VariantsList({ variants, bare = false }) {
  if (!variants) return null
  const paired = variants.pairs.length > 0
  // bare: no card of its own (inside the phone page's top card), smaller heading.
  return (
    <section aria-labelledby="variants-title" className={bare ? '' : 'bg-white border border-slate-200 rounded-[26px] p-4 sm:p-5'}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="variants-title" className={bare ? 'text-sm font-bold text-slate-900' : 'text-lg font-extrabold tracking-[-0.03em] text-slate-900'}>
          Variants
        </h2>
        {variants.source && <p className="font-mono text-xs text-slate-500">from {variants.source}</p>}
      </div>
      {paired ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {variants.pairs.map((p, i) => (
            <li
              key={`${p.ram}+${p.storage}`}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-semibold ${
                i === 0 ? 'bg-sage-700 text-white border-sage-700' : 'border-slate-300 text-slate-900'
              }`}
            >
              <span className="font-mono">
                {formatGb(p.ram)} + {formatGb(p.storage)}
              </span>
              {i === 0 && <span className="text-xs font-bold opacity-90">Standard</span>}
            </li>
          ))}
        </ul>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm">
          {variants.ram.length > 0 && <OptionRow label="RAM" sizes={variants.ram} />}
          {variants.storage.length > 0 && <OptionRow label="Storage" sizes={variants.storage} />}
        </dl>
      )}
      <p className={`text-xs text-slate-500 ${bare ? 'mt-2' : 'mt-3'}`}>
        The tiles above show the standard (base) model. Check the store for which variants it sells.
      </p>
    </section>
  )
}

function OptionRow({ label, sizes }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <dt className="w-16 font-semibold text-slate-600">{label}</dt>
      {sizes.map((gb, i) => (
        <dd
          key={gb}
          className={`m-0 px-3 py-1.5 rounded-full border font-mono font-semibold ${
            i === 0 ? 'bg-sage-700 text-white border-sage-700' : 'border-slate-300 text-slate-900'
          }`}
        >
          {formatGb(gb)}
          {i === 0 && sizes.length > 1 && <span className="ml-1.5 font-sans text-xs font-bold opacity-90">Standard</span>}
        </dd>
      ))}
    </div>
  )
}
