import { useMemo } from 'react'
import { diffWords } from '../utils/wordDiff'

// Changes are marked by element and text decoration (strike-through / underline),
// not by colour alone, and screen readers hear where each change starts and ends.
function Segments({ segments, Mark, srStart, srEnd, markClass }) {
  return segments.map((segment, i) =>
    segment.changed ? (
      <Mark key={i} className={markClass}>
        <span className="sr-only">{srStart}</span>
        {segment.text}
        <span className="sr-only">{srEnd}</span>
      </Mark>
    ) : (
      <span key={i}>{segment.text}</span>
    ),
  )
}

const panelClass = 'text-sm rounded-md p-2 whitespace-pre-line break-words border'

/**
 * Before/after view of a spec correction: current text with removed words struck
 * through, suggested text with added words underlined. Side by side from sm up,
 * stacked on narrow screens.
 */
export default function CorrectionDiff({ current, suggested, headingLevel = 3 }) {
  const diff = useMemo(() => diffWords(current ?? '', suggested ?? ''), [current, suggested])
  const Heading = `h${headingLevel}`

  return (
    <div>
      <p className="text-xs text-gray-600 mb-2">
        {diff.identical
          ? 'The suggested text has the same words as the current text (only spacing differs, if anything).'
          : diff.coarse
            ? 'These texts differ too much to compare word by word; the changed part is marked as a whole.'
            : 'Removed words are struck through; added words are underlined.'}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <Heading className="text-xs font-semibold text-gray-700 mb-1">Current</Heading>
          <p className={`${panelClass} text-gray-700 bg-gray-50 border-gray-200`}>
            <Segments
              segments={diff.before}
              Mark="del"
              srStart="[deletion start] "
              srEnd=" [deletion end]"
              markClass="bg-red-100 text-red-900 line-through decoration-2 decoration-red-800 rounded-sm px-0.5"
            />
          </p>
        </div>
        <div className="min-w-0">
          <Heading className="text-xs font-semibold text-gray-700 mb-1">Suggested</Heading>
          <p className={`${panelClass} text-gray-900 bg-sage-50 border-sage-200`}>
            <Segments
              segments={diff.after}
              Mark="ins"
              srStart="[insertion start] "
              srEnd=" [insertion end]"
              markClass="bg-emerald-100 text-emerald-950 underline decoration-2 underline-offset-2 decoration-emerald-800 rounded-sm px-0.5"
            />
          </p>
        </div>
      </div>
    </div>
  )
}
