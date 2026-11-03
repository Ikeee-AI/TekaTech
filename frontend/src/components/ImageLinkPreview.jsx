import { CheckCircle2, ImageOff, Loader2 } from 'lucide-react'

/**
 * Live preview of the gadget form's image link (#202). The browser loads the link as an
 * <img>, exactly like the catalog card will, and reports 'loaded' or 'failed' through
 * onResult(url, status), so a web-page link is caught before saving.
 * `status` is the current result for `url`: 'pending', 'loaded' or 'failed'.
 */
export default function ImageLinkPreview({ url, status, onResult }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      {/* Same box as the catalog card's photo (GadgetList GadgetCard: w-24 h-24, rounded-lg,
          object-cover), so "how the catalog card will show it" is true, cropping included. */}
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {/* key: a new link starts a fresh load, so a stale onLoad can't mark it as working. */}
        <img
          key={url}
          src={url}
          alt="Preview of the image link"
          onLoad={() => onResult(url, 'loaded')}
          onError={() => onResult(url, 'failed')}
          className={status === 'loaded' ? 'h-full w-full object-cover' : 'hidden'}
        />
        {status === 'pending' && <Loader2 size={18} aria-hidden="true" className="animate-spin text-slate-500" />}
        {status === 'failed' && <ImageOff size={18} aria-hidden="true" className="text-red-700" />}
      </div>
      <p role="status" className="min-w-0 text-sm">
        {status === 'pending' && <span className="text-slate-600">Checking the image link…</span>}
        {status === 'loaded' && (
          <span className="inline-flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 size={16} aria-hidden="true" className="shrink-0" />
            Image found. This is how the catalog card will show it.
          </span>
        )}
        {status === 'failed' && (
          <span className="text-red-800">
            Couldn&apos;t load an image from this link. Open it in a new tab: a direct image link shows only the
            picture.
          </span>
        )}
      </p>
    </div>
  )
}
