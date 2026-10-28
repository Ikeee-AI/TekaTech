import { useEffect, useRef } from 'react'

const EDITABLE = 'input, textarea, select, [contenteditable="true"]'

/**
 * After a client-side route change, moves keyboard and screen-reader focus to the
 * element with `targetId` (the <main> landmark, which has tabIndex={-1}), so the
 * user starts at the new page's content instead of wherever the old page left focus
 * (often <body> once the clicked link has unmounted). The first page load is left
 * alone, and so is focus in a text field: typing in the navbar search moves to the
 * catalog, and that must not steal the cursor mid-word.
 */
export function useRouteFocus(pathname, targetId) {
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    const active = document.activeElement
    if (active instanceof Element && active.matches(EDITABLE)) return
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [pathname, targetId])
}
