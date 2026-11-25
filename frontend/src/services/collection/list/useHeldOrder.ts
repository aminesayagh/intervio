import { useCallback, useMemo, useState } from 'react'
import type { Id } from '../types'

/**
 * A changed record keeps its place (spec 8.6): after a change the table holds the
 * order it showed, and the records changed here stay even if they no longer match;
 * the list reloads behind it. `release` sorts it again, as do a new search, filter
 * or sort (`view`) and opening another record.
 */
export function useHeldOrder<T>(
  items: T[],
  getId: (record: T) => Id,
  view: string,
  openId: Id | null | undefined,
) {
  const [hold, setHold] = useState<{ order: Id[]; kept: Map<Id, T> } | null>(
    null,
  )
  const [seen, setSeen] = useState({ view, openId })
  if (seen.view !== view || seen.openId !== openId) {
    setSeen({ view, openId })
    if (seen.view !== view || openId) setHold(null)
  }
  const release = useCallback(() => setHold(null), [])
  const forget = useCallback(
    (id: Id) =>
      setHold((held) => {
        if (!held) return held
        const kept = new Map(held.kept)
        kept.delete(id)
        return { order: held.order.filter((other) => other !== id), kept }
      }),
    [],
  )
  const shownItems = useMemo(() => {
    if (!hold) return items
    const latest = new Map(items.map((record) => [getId(record), record]))
    const held = hold.order.flatMap((id) => {
      const record = latest.get(id) ?? hold.kept.get(id)
      return record ? [record] : []
    })
    const placed = new Set(hold.order)
    return [...held, ...items.filter((record) => !placed.has(getId(record)))]
  }, [hold, items, getId])
  /** A record of this list changed: it stays where it shows. */
  const keep = (id: Id, record: T) => {
    const shown = shownItems.map(getId)
    if (!shown.includes(id)) return
    setHold((held) => ({
      order: held?.order ?? shown,
      kept: new Map(held?.kept).set(id, record),
    }))
  }
  // Out of order: the list, reloaded, would show them in another order.
  const outOfOrder =
    hold !== null && shownItems.map(getId).join() !== items.map(getId).join()

  return {
    shownItems,
    outOfOrder,
    keptCount: hold?.kept.size ?? 0,
    keep,
    forget,
    release,
  }
}
