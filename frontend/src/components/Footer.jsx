import { Link } from 'react-router-dom'

const LINKS = [
  ['/about', 'About'],
  ['/how-it-works', 'How it works'],
  ['/faq', 'FAQ'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/contact', 'Contact'],
]

/** Site footer: the content pages and the project line. Theme-aware through the shared tokens. */
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-2">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-1 gap-y-1">
            {LINKS.map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="inline-flex items-center min-h-10 sm:min-h-8 px-2 rounded-md text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-slate-600 px-2">© 2026 TekaTech — a student project · Demo Day release</p>
      </div>
    </footer>
  )
}
