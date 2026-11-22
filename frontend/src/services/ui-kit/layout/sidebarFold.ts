import { useSyncExternalStore } from 'react'

/**
 * A screen can fold the sidebar to its rail for a while (spec 9: a record panel at
 * medium width) without touching the person's saved choice.
 */
let folded = false
const listeners = new Set<() => void>()

export function foldSidebar(on: boolean) {
  if (folded === on) return
  folded = on
  listeners.forEach((listener) => listener())
}

export function useSidebarFolded() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => folded,
  )
}
