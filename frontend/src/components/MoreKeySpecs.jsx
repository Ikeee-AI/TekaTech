import { MORE_SPECS } from '../utils/keySpecs'

/**
 * "More key specs" under the four tiles on the phone page: battery, charging, chip,
 * weight, water resistance, screen size. moreSpecs comes from extractMoreSpecs();
 * each value shows its source site, a missing one says "Not stated by source".
 */
export default function MoreKeySpecs({ moreSpecs, loading = false }) {
  return (
    <section aria-labelledby="more-key-specs-heading" className="bg-white border border-slate-200 rounded-[26px] p-4 sm:p-5">
      <h2 id="more-key-specs-heading" className="text-sm font-bold text-slate-900">
        More key specs
      </h2>
      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        {MORE_SPECS.map((spec) => {
          const found = moreSpecs?.[spec.id]
          return (
            <div key={spec.id} className="min-w-0">
              <dt className="text-xs font-semibold text-slate-500">{spec.label}</dt>
              {loading ? (
                <dd className="mt-1 h-5 w-20 rounded bg-slate-100 animate-pulse" aria-label="Loading" />
              ) : found ? (
                <>
                  <dd className="mt-0.5 text-base font-bold text-slate-900 break-words">
                    {found.value}
                    {found.unit && <span className="font-semibold"> {found.unit}</span>}
                  </dd>
                  {found.source && <dd className="font-mono text-[11px] text-slate-500 truncate">{found.source}</dd>}
                </>
              ) : (
                <dd className="mt-0.5 text-sm italic text-slate-500">Not stated by source</dd>
              )}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
