import { useEffect, useRef } from 'react'
import type { Id } from '../types'

/**
 * What happened to a record, said by the record actions (spec 8.3): the cache
 * says that data changed; this says why, so a screen can react (keep a changed record
 * in place, close the panel of a removed one).
 */
export type RecordChange = {
  /** The collection's key. */
  key: string
  id: Id
  /** `removed` covers archived, removed, and found removed by someone else. */
  kind: 'updated' | 'created' | 'removed'
  record?: unknown
}

type Listener = (change: RecordChange) => void
const listeners = new Set<Listener>()

/** Tells every screen listening that a record changed. */
export function announce(change: RecordChange) {
  for (const listener of [...listeners]) listener(change)
}

/** Listens to every record change, of any collection, while the component is mounted. */
export function useRecordChanges(listener: Listener) {
  // The latest listener, without subscribing again on every render.
  const latest = useRef(listener)
  useEffect(() => {
    latest.current = listener
  })
  useEffect(() => {
    const call: Listener = (change) => latest.current(change)
    listeners.add(call)
    return () => {
      listeners.delete(call)
    }
  }, [])
}
