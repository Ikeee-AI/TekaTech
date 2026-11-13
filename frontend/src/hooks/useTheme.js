import { useCallback, useState } from 'react'

const KEY = 'tekatech:theme'

function readTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/**
 * Dark mode is the default; light is opt-in and remembered per browser.
 * index.html applies the saved choice before first paint, so this hook only reads and flips it.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(readTheme)

  const setTheme = useCallback((next) => {
    const root = document.documentElement
    if (next === 'light') root.dataset.theme = 'light'
    else delete root.dataset.theme
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // storage blocked: the choice lasts for this page only
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', next === 'light' ? '#eef0f4' : '#09090b')
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
