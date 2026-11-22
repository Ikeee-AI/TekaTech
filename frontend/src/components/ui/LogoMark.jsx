import { useId } from 'react'

// The TekaTech mark: the original (pre-rebrand) chip built from two interlocking T's with a
// magnifying glass in its core, redrawn as a vector. It paints in currentColor, so the parent's
// text colour decides it (text-sage-700 = lime in dark, blue in light).
export default function LogoMark({ className = '' }) {
  const maskId = useId()
  return (
    <svg viewBox="0 -93.5 962 962" className={className} aria-hidden="true" focusable="false">
      <defs>
        <mask id={maskId}>
          <rect x="286" y="188" width="390" height="390" rx="20" fill="#fff" />
          <circle cx="441" cy="338" r="105" fill="none" stroke="#000" strokeWidth="40" />
          <path d="M516 420L720 636" stroke="#000" strokeWidth="44" />
        </mask>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="56" strokeLinecap="round">
        <path d="M28 99H675M192.5 99V577M258 28V99M427 28V99M602 28V99M119 294H192M119 476H192" />
        <path d="M286 670H934M768.5 188V670M359 670V747M537 670V747M705 670V747M768 312H843M768 490H843" />
      </g>
      <rect x="286" y="188" width="390" height="390" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  )
}
