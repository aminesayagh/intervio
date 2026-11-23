import { useSyncExternalStore } from 'react'

// ponytail: a small router on the History API covers flat pages; switch to a routing
// library when nested layouts or route loaders are needed. The query string is nuqs's
// (query.ts): this file only changes pages and pushes entries that carry state.

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

/** The query string shown, for reading it at once (nuqs's createLoader). */
export const currentSearch = () => window.location.search

/** The address shown (path and query), for building another one from it. */
export const currentAddress = () =>
  window.location.pathname + window.location.search
