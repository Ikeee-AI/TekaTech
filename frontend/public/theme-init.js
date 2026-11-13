// Applies the saved theme before first paint (dark is the default). See src/hooks/useTheme.js.
// Loaded from index.html as a plain, render-blocking script (not inline) so the
// Content-Security-Policy can use script-src 'self' without 'unsafe-inline'.
try {
  if (localStorage.getItem('tekatech:theme') === 'light') document.documentElement.dataset.theme = 'light'
} catch {
  /* storage blocked: stay dark */
}
