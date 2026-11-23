import {
  createBrowserRouter,
  useLocation,
  type RouteObject,
} from 'react-router'

// Pages are React Router's (data mode, decision 142): navigate() goes through the one
// router, so code outside components keeps calling it. The query string is nuqs's
// (query.tsx): this file changes pages and pushes entries that carry state.

type Router = ReturnType<typeof createBrowserRouter>
let router: Router | null = null

/** Creates the router navigate() goes through; one at a time (a test makes its own). */
export function createRouter(routes: RouteObject[]) {
  router?.dispose()
  router = createBrowserRouter(routes)
  return router
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
  if (!router) throw new Error('navigate() before createRouter()')
  void router.navigate(to, { replace, state: { ...extra, [OWN]: true } })
}

/** The state an entry was pushed with: React Router keeps it under `usr`. */
const usr = () =>
  (window.history.state as { usr?: Record<string, unknown> } | null)?.usr ?? {}

/** The extra state the current history entry was pushed with (see navigate). */
export const entryState = usr

/** True when the current history entry was pushed by the app (so going back stays in the app). */
export const isOwnEntry = () => usr()[OWN] === true

/** Current path, re-rendering on navigation. */
export function usePath() {
  return useLocation().pathname
}

/** The query string shown, for reading it at once (nuqs's createLoader). */
export const currentSearch = () => window.location.search

/** The address shown (path and query), for building another one from it. */
export const currentAddress = () =>
  window.location.pathname + window.location.search
