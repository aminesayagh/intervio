import { useSyncExternalStore } from 'react'

// ponytail: a small router on the History API covers flat pages; switch to a routing
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

/** Marks the history entries this app pushed, so a caller can tell them from a visit's first page. */
const OWN = 'intervio'

export function navigate(
  to: string,
  {
    replace = false,
    state: extra = {},
  }: { replace?: boolean; state?: Record<string, unknown> } = {},
) {
  const state = { ...extra, [OWN]: true }
  if (replace) window.history.replaceState(state, '', to)
  else window.history.pushState(state, '', to)
  listeners.forEach((listener) => listener())
}

/**
 * Changes only the query string of the current address. Empty values are left out,
 * so defaults never show in the address.
 */
export function setSearchParams(
  params: URLSearchParams | Record<string, string | null | undefined>,
  options: { replace?: boolean; state?: Record<string, unknown> } = {},
) {
  const entries =
    params instanceof URLSearchParams ? [...params] : Object.entries(params)
  const search = new URLSearchParams()
  for (const [key, value] of entries) if (value) search.set(key, value)
  const query = search.toString()
  navigate(window.location.pathname + (query ? `?${query}` : ''), options)
}

/** The extra state the current history entry was pushed with (see navigate). */
export function entryState(): Record<string, unknown> {
  return (window.history.state as Record<string, unknown> | null) ?? {}
}

/** True when the current history entry was pushed by the app (so going back stays in the app). */
export function isOwnEntry() {
  return (
    (window.history.state as Record<string, unknown> | null)?.[OWN] === true
  )
}

/** Current path, re-rendering on navigation. */
export function usePath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

/** Current query string, re-rendering on navigation. */
function useSearch() {
  return useSyncExternalStore(subscribe, () => window.location.search)
}

/** Current query string parameters. */
export function useSearchParams() {
  return new URLSearchParams(useSearch())
}
