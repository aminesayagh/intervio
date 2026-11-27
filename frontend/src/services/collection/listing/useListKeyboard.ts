import type { KeyboardEvent } from 'react'

/**
 * The list's keys with the panel open (spec 10): ↑ and ↓ open the previous or next
 * record shown; Escape goes back one linked step, or closes the panel. Keys typed
 * in a field, a menu or a dialog are theirs.
 */
export function useListKeyboard<T>({
  panelOpen,
  openId,
  items,
  getId,
  open,
  back,
}: {
  panelOpen: boolean
  openId: string | null
  /** The records in the order shown. */
  items: T[]
  getId: (record: T) => string
  open: (id: string) => void
  /** Escape: one step back, or close. */
  back: () => void
}) {
  return (event: KeyboardEvent) => {
    if (!panelOpen || event.defaultPrevented) return
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, [role="menu"], [role="dialog"]'))
      return
    if (event.key === 'Escape') {
      event.preventDefault()
      back()
      return
    }
    if (!openId || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp'))
      return
    const index = items.findIndex((item) => getId(item) === openId)
    const next = items[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (next) {
      event.preventDefault()
      open(getId(next))
    }
  }
}
