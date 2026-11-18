import { useSyncExternalStore } from 'react'

// ponytail: a 30-line router on the History API covers flat pages; switch to a routing
// library when nested layouts or route loaders are needed.

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  listeners.forEach((listener) => listener())
}

/** Current path, re-rendering on navigation. */
export function usePath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

/** Current query string parameters. */
export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => window.location.search)
  return new URLSearchParams(search)
}
