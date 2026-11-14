import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

const STEPS = ['Browse phones', 'Compare side by side', 'Ask the AI, answers cite sources']

const linkClass =
  'shrink-0 font-semibold text-sage-700 underline underline-offset-2 hover:text-sage-800 rounded-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2'

/**
 * The catalog home's value statement (critique item #2, 14 Nov 2026). Kept compact so the first
 * phones stay high on a phone screen: there it is one short line (plus a short account note for
 * visitors); from sm up it shows the full statement and the three steps.
 */
export default function HowItWorks({ signedIn }) {
  return (
    <section
      aria-label="What TekaTech does"
      className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 sm:px-5 sm:py-3.5 text-sm"
    >
      {/* Phones: one line. */}
      <p className="sm:hidden flex items-center gap-2 text-[13px] text-slate-800">
        <ShieldCheck size={15} className="shrink-0 text-sage-700" aria-hidden="true" />
        <span className="min-w-0">Specs and AI answers cite sources.</span>
        <Link to="/how-it-works" className={`ml-auto ${linkClass}`}>
          How?
        </Link>
      </p>

      {/* sm and up: the full statement and the three steps. */}
      <div className="hidden sm:flex flex-col gap-2">
        <p className="flex items-center gap-2 text-slate-900 font-semibold">
          <ShieldCheck size={16} className="shrink-0 text-sage-700" aria-hidden="true" />
          Phone specs you can check. Every spec links to the brand&apos;s official page, and every AI answer cites
          its source.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-700">
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5">
                  <span className="font-mono text-xs font-semibold text-sage-700" aria-hidden="true">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="text-slate-400" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
          <Link to="/how-it-works" className={linkClass}>
            How it works
          </Link>
        </div>
      </div>

      {!signedIn && (
        <>
          <p className="sm:hidden mt-0.5 text-xs text-slate-600">Free account needed for specs, compare and AI.</p>
          <p className="hidden sm:block mt-2 text-sm text-slate-600">
            Free account needed to view full specs, compare and ask the AI.
          </p>
        </>
      )}
    </section>
  )
}
