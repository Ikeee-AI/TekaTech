import { Loader2 } from 'lucide-react'

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg whitespace-nowrap transition ' +
  'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const VARIANTS = {
  primary: 'bg-sage-700 text-white hover:bg-sage-800 shadow-xs focus-visible:ring-sage-600',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus-visible:ring-sage-600',
  subtle: 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 focus-visible:ring-sage-600',
  outline: 'bg-white text-sage-700 border border-sage-300 hover:bg-sage-50 focus-visible:ring-sage-600',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50 focus-visible:ring-red-400',
  dangerSolid: 'bg-red-700 text-white hover:bg-red-800 shadow-xs focus-visible:ring-red-400',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-sage-600',
}

const SIZES = {
  sm: 'text-sm px-3 py-1.5 min-h-10 sm:min-h-9', // 40px touch target on phones
  md: 'text-sm px-4 py-2 min-h-10',
  lg: 'text-base px-5 py-2.5 min-h-11',
}

const ICON_SIZES = { sm: 14, md: 16, lg: 18 }

/**
 * The one button style for the whole site. Renders a <button> by default;
 * pass `as={Link}` (plus `to`) to get the same look on a router link.
 * `loading` swaps the icon for a spinner, disables the control and sets aria-busy.
 */
export default function Button({
  as: Component = 'button',
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isButton = Component === 'button'
  const iconSize = ICON_SIZES[size]
  return (
    <Component
      {...(isButton ? { type: 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
      {children}
    </Component>
  )
}
