import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import type { Id } from '../types'

/**
 * What the table shows on its rows besides the records: the open one, the selected
 * ones, and how a shared value is saved on them (decision 135).
 *
 * React Aria builds every row again when a value its rows depend on changes. So
 * these values don't go to the rows as props: the rows and cells read them from
 * this store, and a change re-renders only the rows and cells it concerns.
 */
export type Marks = {
  openId: Id | null
  selected: ReadonlySet<Id>
  /** "Applies to 3 items", shown by the editor of a shared value. */
  note: string
  saveShared?: (...args: never[]) => Promise<void>
}

export type MarksStore = {
  get: () => Marks
  /** The rows the pointer or the focus reached: their cells mount their editors. */
  isAwake: (id: Id) => boolean
  wake: (id: Id) => void
  subscribe: (listener: () => void) => () => void
}

const MarksContext = createContext<MarksStore | null>(null)
export const MarksProvider = MarksContext.Provider

/** The store, given the latest marks after each render. */
export function useMarksStore(marks: Marks): MarksStore {
  const [store] = useState(() => {
    let value = marks
    // ponytail: rows stay awake until the table leaves; enough for a session's hovering.
    const awake = new Set<Id>()
    const listeners = new Set<() => void>()
    const notify = () => listeners.forEach((listener) => listener())
    return {
      get: () => value,
      set(next: Marks) {
        value = next
        notify()
      },
      isAwake: (id: Id) => awake.has(id),
      wake(id: Id) {
        if (awake.has(id)) return
        awake.add(id)
        notify()
      },
      subscribe(listener: () => void) {
        listeners.add(listener)
        return () => void listeners.delete(listener)
      },
    }
  })
  useLayoutEffect(() => store.set(marks))
  return store
}

/** One mark, read from the store: the component renders again only when it changes. */
export function useMark<R extends string | boolean | null>(
  read: (marks: Marks, store: MarksStore) => R,
): R {
  const store = useMarks()
  return useSyncExternalStore(store.subscribe, () => read(store.get(), store))
}

/** The store itself, to read the latest marks in an event. */
export function useMarks() {
  const store = useContext(MarksContext)
  if (!store) throw new Error('useMark outside MarksProvider')
  return store
}
