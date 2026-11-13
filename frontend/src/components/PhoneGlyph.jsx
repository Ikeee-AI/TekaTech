// Neutral phone outline shown when a gadget has no photo. Decorative only.
export default function PhoneGlyph({ className = 'w-16 h-28' }) {
  return (
    <svg viewBox="0 0 72 128" className={className} aria-hidden="true">
      <rect x="3" y="3" width="66" height="122" rx="14" className="fill-slate-200 stroke-slate-400" strokeWidth="2" />
      <rect x="9" y="9" width="54" height="110" rx="9" className="fill-slate-50" />
      <circle cx="36" cy="16" r="2.5" className="fill-slate-400" />
    </svg>
  )
}
