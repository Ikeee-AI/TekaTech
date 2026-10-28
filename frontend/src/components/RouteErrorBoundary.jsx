import { Component } from 'react'
import { claimAutoReload, isChunkLoadError } from '../utils/chunkErrors'

function reloadPage() {
  window.location.reload()
}

const buttonClass =
  'inline-flex items-center justify-center min-h-10 px-4 py-2 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2'

/**
 * Catches render errors in the routed pages. A failed lazy chunk (usually an old tab
 * after a deploy) reloads once automatically, then offers a Reload button; any other
 * error gets a generic message. Error details are never shown to the user.
 * Sits inside the keyed <main>, so moving to another page starts it fresh.
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reloading: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && claimAutoReload()) {
      this.setState({ reloading: true })
      ;(this.props.onReload ?? reloadPage)()
    }
  }

  render() {
    const { error, reloading } = this.state
    if (!error) return this.props.children

    const reload = this.props.onReload ?? reloadPage
    const updated = isChunkLoadError(error)

    if (reloading) {
      return (
        <p role="status" className="text-slate-600">
          TekaTech was updated. Loading the new version…
        </p>
      )
    }

    return (
      <section role="alert" className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">
          {updated ? 'TekaTech was updated' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-slate-700">
          {updated
            ? 'A newer version is available. Reload to continue where you were.'
            : 'This page could not be shown. Reloading usually fixes it.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reload} className={`${buttonClass} bg-sage-700 text-white hover:bg-sage-800`}>
            Reload
          </button>
          {!updated && (
            // A full page load, not a router link: the app state that just failed is discarded.
            <a href="/" className={`${buttonClass} border border-slate-300 text-slate-800 hover:bg-slate-100`}>
              Back to catalog
            </a>
          )}
        </div>
      </section>
    )
  }
}
