import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type { PageParam } from '../data/collectionQuery'

/**
 * Where the person was in a list (spec 8.4, decided 2026-11-23): the page holding the
 * first row in view, by its cursor, and the row's place in that page. A reload loads
 * that page only (and the one before when the row is near its top), never every page
 * above it; the rest above loads as the person scrolls up. Kept per browser tab, for
 * the list as it was asked (search, filters, sort).
 */
type Bookmark = { list: string; page: PageParam; row: number }

/** Rows near the top: closer than this, the page before loads. */
const NEAR_TOP = 5

const storageKey = (key: string) => `intervio.collection.${key}.scroll`

/** The page to start at, when the tab left this list further down. */
export function readBookmark(key: string, list: string): Bookmark | null {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(storageKey(key)) ?? 'null',
    ) as Bookmark | null
    return saved?.list === list ? saved : null
  } catch {
    return null // storage blocked or broken: the list starts at the top
  }
}

const samePage = (a: PageParam, b: PageParam) =>
  a.cursor === b.cursor && a.direction === b.direction

/**
 * Keeps the bookmark as the person scrolls, scrolls back to it once its page is
 * loaded, loads the page before near the top, and keeps the rows in view where they
 * are when rows are added above them. Rows are one height, so positions are counted.
 */
export function useScrollBookmark<T>({
  key,
  list,
  scrollRef,
  rowHeight,
  pages,
  pageParams,
  getId,
  previous,
}: {
  key: string
  /** The list as asked (search, filters, sort): a bookmark is for that list only. */
  list: string
  scrollRef: RefObject<HTMLElement | null>
  rowHeight: number
  pages: { items: T[] }[] | undefined
  pageParams: PageParam[] | undefined
  getId: (record: T) => string
  previous: { has: boolean; loading: boolean; load: () => void }
}) {
  const items = pages?.flatMap((page) => page.items) ?? []
  const firstId = items[0] ? getId(items[0]) : null

  // Back to the bookmark once its page is there: after a reload (the first page
  // loaded), or from the cache (the page among those kept). Once per list. The
  // list's element appears after its placeholders leave, a few frames later: the
  // first try waits for it.
  const restored = useRef<string | null>(null)
  const pending = useRef<number | null>(null)
  /** Restores the bookmark: false while the list's element isn't there yet. */
  const restoreNow = useRef<() => boolean>(() => true)
  useEffect(() => {
    restoreNow.current = () => {
      if (restored.current === list || !pages || !pageParams) return true
      const element = scrollRef.current
      if (!element) return false
      restored.current = list
      const bookmark = readBookmark(key, list)
      if (!bookmark) return true
      const index = pageParams.findIndex((page) =>
        samePage(page, bookmark.page),
      )
      if (index === -1) return true
      const before = pages
        .slice(0, index)
        .reduce((count, page) => count + page.items.length, 0)
      const target = (before + bookmark.row) * rowHeight
      element.scrollTop = target
      // One page may be too short to scroll that far: the next page, once loaded,
      // takes it the rest of the way (unless the person scrolls first).
      if (element.scrollTop < target - 1) pending.current = target
      // Near the top of its page after a reload: the page before loads at once, so
      // the scrollbar shows there is more above (spec 8.4).
      if (before + bookmark.row < NEAR_TOP && previous.has) previous.load()
      return true
    }
  })
  useEffect(() => {
    if (!pages) return
    let frames = 0
    let frame = 0
    const attempt = () => {
      const waiting = restoreNow.current() === false
      // The bookmark's row not reached yet (its page too short): the list grows a
      // few frames after a page arrives, so it keeps trying for a moment.
      const element = scrollRef.current
      if (element && pending.current !== null) {
        element.scrollTop = pending.current
        if (element.scrollTop >= pending.current - 1) pending.current = null
      }
      if ((waiting || pending.current !== null) && frames++ < 120)
        frame = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(frame)
  }, [pages, list, scrollRef])

  // Rows added above (the page before): the rows in view stay where they are.
  const shownFirst = useRef<string | null>(null)
  useLayoutEffect(() => {
    const element = scrollRef.current
    const last = shownFirst.current
    if (element && last && firstId !== last) {
      const moved = items.findIndex((item) => getId(item) === last)
      if (moved > 0) element.scrollTop += moved * rowHeight
    }
    shownFirst.current = firstId
  })

  // As the person scrolls: the bookmark follows, and the page before loads near the top.
  const latest = useRef({ pages, pageParams, previous })
  useEffect(() => {
    latest.current = { pages, pageParams, previous }
  })
  useEffect(() => {
    let frame = 0
    // On the document, in the capture phase: the list's element mounts after its
    // placeholders leave, so it may not be there yet when this runs.
    const onScroll = (event: Event) => {
      const element = scrollRef.current
      if (!element || event.target !== element) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { pages, pageParams, previous } = latest.current
        if (!pages || !pageParams) return
        const first = Math.floor(element.scrollTop / rowHeight)
        if (first < NEAR_TOP && previous.has && !previous.loading)
          previous.load()
        let start = 0
        for (let index = 0; index < pages.length; index++) {
          const length = pages[index].items.length
          if (first < start + length || index === pages.length - 1) {
            const bookmark: Bookmark = {
              list,
              page: pageParams[index],
              row: Math.max(0, first - start),
            }
            try {
              sessionStorage.setItem(storageKey(key), JSON.stringify(bookmark))
            } catch {
              // storage blocked: a reload starts at the top
            }
            return
          }
          start += length
        }
      })
    }
    document.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    })
    // The person moves the list themselves: the bookmark's target no longer applies.
    // (A scroll event can't tell: the code's own scrolling sends them too.)
    const intents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    const onIntent = (event: Event) => {
      const element = scrollRef.current
      if (
        element &&
        event.target instanceof Node &&
        element.contains(event.target)
      )
        pending.current = null
    }
    for (const name of intents)
      document.addEventListener(name, onIntent, {
        capture: true,
        passive: true,
      })
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      for (const name of intents)
        document.removeEventListener(name, onIntent, { capture: true })
      cancelAnimationFrame(frame)
    }
  }, [scrollRef, rowHeight, key, list])
}
