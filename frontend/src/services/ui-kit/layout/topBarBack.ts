import { useSyncExternalStore } from 'react'

/** A way up one level, offered by a screen: what the ‹ says, and what it does. */
export type Back = { label: string; run: () => void }

/**
 * On a narrow screen, the top bar shows a ‹ before the menu while a screen offers a
 * way up one level (decision 128: a list reached by drilling, where wide screens
 * show strips). The screen offers it while it shows; `offerBack` returns the
 * function that takes it back.
 */
let back: Back | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export function offerBack(next: Back) {
  back = next
  notify()
  return () => {
    if (back !== next) return
    back = null
    notify()
  }
}

export function useTopBarBack() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => back,
  )
}
