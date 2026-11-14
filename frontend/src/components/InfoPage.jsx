import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const infoLink =
  'font-semibold text-sage-700 underline underline-offset-2 hover:text-sage-800 rounded-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2'

/**
 * Shell for the plain content pages (About, How it works, FAQ, Privacy, Terms, Contact):
 * one readable column, a page title, an optional "last updated" line and an optional
 * draft note shown above the text (Privacy and Terms).
 */
export default function InfoPage({ title, intro, updated, draft = false, children }) {
  useDocumentTitle(title)
  return (
    <article className="max-w-3xl mx-auto flex flex-col gap-6 pb-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.045em] text-slate-900">{title}</h1>
        {updated && <p className="text-sm text-slate-600">Last updated: {updated}</p>}
        {intro && <p className="text-base text-slate-700 leading-relaxed">{intro}</p>}
      </header>
      {draft && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Draft</strong> — reviewed by the TekaTech team; not legal advice.
          </span>
        </p>
      )}
      <div className="flex flex-col gap-6 text-slate-700 leading-relaxed">{children}</div>
    </article>
  )
}

/** One titled block of an info page. */
export function InfoSection({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-bold tracking-[-0.03em] text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

/** A bulleted list with the page's spacing. */
export function InfoList({ children }) {
  return <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-slate-400">{children}</ul>
}

/** An in-app link styled for body text. */
export function InfoLink({ to, children }) {
  return (
    <Link to={to} className={infoLink}>
      {children}
    </Link>
  )
}

/** The team's contact address as a mail link. */
export function ContactEmail() {
  return (
    <a href="mailto:tekatechemail@gmail.com" className={`${infoLink} break-all`}>
      tekatechemail@gmail.com
    </a>
  )
}
