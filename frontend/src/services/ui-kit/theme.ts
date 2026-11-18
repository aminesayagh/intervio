export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'intervio.theme'

/** Saved choice first, else the computer setting. */
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage can be blocked; follow the computer setting.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** HeroUI reads the theme from the class and data-theme attribute on <html>. */
export function applyTheme(theme: Theme, save = false) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  root.dataset.theme = theme
  if (save) {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Not saved; the choice still applies until the page is closed.
    }
  }
}
