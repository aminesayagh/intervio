import { entryState, navigate } from '../../navigation'

/** A view left by drilling (spec 12.1): its address, and the name its strip shows. */
export type View = { address: string; name: string }

const KEY = 'intervio.collection.views'

/** The views left, oldest first. The tab keeps them (session storage). */
export function readViews(): View[] {
  try {
    const views = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(views) ? (views as View[]) : []
  } catch {
    return [] // storage blocked or broken: no strips
  }
}

export function writeViews(views: View[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(views))
  } catch {
    // storage blocked: the strips are not remembered, Back still works
  }
}

/**
 * The views this page was reached through: the stack, when this history entry was
 * pushed by a drill. An entry reached any other way (the sidebar, a link) has none.
 */
export function currentViews(): View[] {
  const depth = entryState().drill
  if (typeof depth !== 'number') return []
  return readViews().slice(0, depth)
}

/**
 * Opens another list from this view (spec 12.1, "Show all"): the view left goes on
 * the stack, and the new address is pushed, so Back returns to it.
 */
export function drill(to: string, name: string) {
  const views = [
    ...currentViews(),
    { address: window.location.pathname + window.location.search, name },
  ]
  writeViews(views)
  navigate(to, { state: { drill: views.length } })
}
