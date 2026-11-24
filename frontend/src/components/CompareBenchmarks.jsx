import { useEffect, useState } from 'react'
import { ExternalLink, Gamepad2 } from 'lucide-react'
import { api } from '../api/client'
import { formatBenchmarkValue, sharedBenchmarks } from '../utils/benchmarks'
import { withoutDoubledBrand } from '../utils/gadgetName'

/**
 * Compare page (24 Nov 2026): published benchmarks that at least two of the compared phones
 * share, as bars scaled to the best result in each row. Higher is better for every stored kind
 * (average fps, benchmark points). Hidden when the phones share no results.
 */
export default function CompareBenchmarks({ gadgets }) {
  const [rowsById, setRowsById] = useState({})
  const ids = gadgets.map((g) => g.id)
  const idsKey = ids.join(',')

  useEffect(() => {
    if (typeof api.getBenchmarks !== 'function') return undefined
    let cancelled = false
    for (const id of idsKey.split(',').filter(Boolean)) {
      api
        .getBenchmarks(id)
        .then((rows) => !cancelled && setRowsById((prev) => ({ ...prev, [id]: rows })))
        .catch(() => !cancelled && setRowsById((prev) => ({ ...prev, [id]: [] })))
    }
    return () => {
      cancelled = true
    }
  }, [idsKey])

  const groups = sharedBenchmarks(rowsById, ids)
  if (groups.length === 0) return null

  return (
    <section aria-labelledby="compare-benchmarks-heading" className="bg-white border border-slate-200 rounded-[26px] p-4 sm:p-5">
      <h2 id="compare-benchmarks-heading" className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.03em] text-slate-900">
        <Gamepad2 size={20} className="text-sage-700" aria-hidden="true" />
        Gaming and performance
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Published results both phones share, higher is better. TekaTech doesn&apos;t run these tests itself.
      </p>
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        {groups.map((group) => {
          const max = Math.max(...Object.values(group.values).map((r) => Number(r.value) || 0), 0)
          return (
            <div key={group.key}>
              <h3 className="text-sm font-bold text-slate-900">
                {group.test}
                {group.settings && <span className="font-normal text-slate-500"> · {group.settings}</span>}
                <span className="font-normal text-slate-500"> ({group.unit})</span>
              </h3>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {gadgets.map((g) => {
                  const row = group.values[g.id]
                  const value = row ? Number(row.value) : null
                  const best = row && value === max && max > 0
                  return (
                    <li key={g.id} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-2 text-sm">
                      <span className="truncate text-slate-700" title={g.name}>
                        {withoutDoubledBrand(g.name)}
                      </span>
                      <span className="h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                        {row && (
                          <span
                            className={`block h-full rounded-full ${best ? 'bg-sage-700' : 'bg-slate-400'}`}
                            style={{ width: `${max ? (value / max) * 100 : 0}%` }}
                          />
                        )}
                      </span>
                      {row ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 tabular-nums rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 ${best ? 'font-extrabold text-slate-900' : 'text-slate-700'}`}
                        >
                          {formatBenchmarkValue(row.value)}
                          <ExternalLink size={11} aria-hidden="true" />
                          <span className="sr-only"> {group.unit}, source opens in a new tab</span>
                        </a>
                      ) : (
                        <span className="text-slate-500">Not published</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
