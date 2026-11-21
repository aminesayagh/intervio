import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, type RefObject } from 'react'

/** How close to the end, in records, the next page starts loading (spec 8.1). */
const NEAR_END = 5

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
}: {
  scrollRef: RefObject<HTMLElement | null>
  count: number
  estimateSize: number
  canLoadMore: boolean
  loadMore: () => void
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

  return virtualizer
}
