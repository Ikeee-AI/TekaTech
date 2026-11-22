import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const arrowClass =
  'hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600'

/**
 * One row of tiles that slides sideways instead of wrapping onto a second line.
 * Swipe or trackpad-scroll anywhere; tiles snap into place. From the sm breakpoint
 * up, round arrow buttons at the right of the heading row page left/right; each is
 * dimmed when there is nothing more on its side, and both go when everything fits.
 * The edges fade where more tiles are hidden. Children should be fixed-width,
 * shrink-0 items with `snap-start`. `heading` is the section title, shown beside the arrows.
 */
export default function TileCarousel({ label, heading, children }) {
  const trackRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const [edges, setEdges] = useState({ prev: false, next: false })

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    // 2 px slack: fractional scroll positions on zoomed or high-DPI screens.
    setEdges({ prev: el.scrollLeft > 2, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // jsdom (tests) has no ResizeObserver; the scroll listener alone is enough there.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer?.disconnect()
    }
  }, [measure, children])

  const page = (direction) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  // Fade only the edges that hide more tiles.
  const fade = `linear-gradient(to right, ${edges.prev ? 'transparent' : '#000'} 0, #000 ${edges.prev ? '48px' : '0'}, #000 calc(100% - ${edges.next ? '48px' : '0px'}), ${edges.next ? 'transparent' : '#000'} 100%)`

  const scrollable = edges.prev || edges.next

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-3">
        {heading}
        {scrollable && (
          <div className="flex gap-2 shrink-0">
            <button type="button" className={arrowClass} onClick={() => page(-1)} disabled={!edges.prev} aria-label={`Scroll ${label} left`}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className={arrowClass} onClick={() => page(1)} disabled={!edges.next} aria-label={`Scroll ${label} right`}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={trackRef}
        role="group"
        aria-label={label}
        className="flex gap-2.5 sm:gap-3 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 py-1 scroll-px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      >
        {children}
      </div>
    </div>
  )
}
