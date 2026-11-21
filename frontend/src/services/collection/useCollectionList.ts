import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, type RefObject } from 'react'

/** How close to the end, in records, the next page starts loading (spec 8.1). */
const NEAR_END = 5
/** The most pages reloaded to come back to the same place (spec 6.4). */
const MAX_RESTORED_PAGES = 5

type Memory = { address: string; offset: number; pages: number }
function readMemory(key: string): Memory | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null') as Memory | null
  } catch {
    return null
  }
}
function keepMemory(key: string, memory: Memory) {
  try {
    sessionStorage.setItem(key, JSON.stringify(memory))
  } catch {
    // storage blocked: a refresh starts at the top
  }
}

/**
 * The list's virtualizer (spec 8.1): draws only the visible items and a few around
 * them, measures each one, and asks for the next page when the last drawn item comes
 * within NEAR_END records of the end. It never asks again after a failed page: Retry
 * does.
 */
export function useCollectionList({
  scrollRef,
  count,
  estimateSize,
  canLoadMore,
  loadMore,
  hasMore,
  pages,
  memory,
}: {
  scrollRef: RefObject<HTMLElement | null>
  count: number
  estimateSize: number
  canLoadMore: boolean
  loadMore: () => void
  /** More pages exist, even if one is loading now. */
  hasMore: boolean
  /** How many pages are loaded. */
  pages: number
  /** Where the tab remembers the scroll position, and for which list address. */
  memory: { key: string; address: string }
}) {
  // The React Compiler isn't used here, so its warning about TanStack Virtual's
  // unmemoizable functions doesn't apply.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 4,
  })
  const items = virtualizer.getVirtualItems()
  const last = items[items.length - 1]

  useEffect(() => {
    if (last && canLoadMore && last.index >= count - NEAR_END) loadMore()
  }, [last, count, canLoadMore, loadMore])

  // Back to the same place after a refresh or a return from the sidebar (spec 6.4, 8.4):
  // reload the pages seen (up to 5), then scroll to where the list was.
  // ponytail: offset only, no measurement snapshot; add takeSnapshot if rows of very
  // different heights land the list off by a few pixels.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || count === 0) return
    const saved = readMemory(memory.key)
    if (saved?.address !== memory.address) {
      restored.current = true
      return
    }
    if (pages < Math.min(saved.pages, MAX_RESTORED_PAGES) && hasMore) {
      if (canLoadMore) loadMore()
      return
    }
    restored.current = true
    // Straight on the element: the virtualizer would clamp to the rows measured so far.
    const element = scrollRef.current
    if (element) {
      element.scrollTop = saved.offset
      element.dispatchEvent(new Event('scroll'))
    }
  }, [count, pages, hasMore, canLoadMore, loadMore, memory, scrollRef])

  // Remembers the position as the person scrolls.
  const offset = virtualizer.scrollOffset ?? 0
  useEffect(() => {
    if (!restored.current) return
    const timer = setTimeout(
      () => keepMemory(memory.key, { address: memory.address, offset, pages }),
      150,
    )
    return () => clearTimeout(timer)
  }, [offset, pages, memory])

  return virtualizer
}
