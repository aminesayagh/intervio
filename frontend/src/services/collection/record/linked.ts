import { useQueries, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { keys } from '../data/collectionQuery'
import type { AnyCollection } from '../definition'
import type { Id } from '../types'

/**
 * A linked record opened in the panel (decision 137): its collection's key and its id.
 * The address keeps the chain after the record opened from the list:
 * ?open={id}&linked={key}:{id},{key}:{id}. The last one shows; the others are tabs.
 */
export type Step = { key: string; id: Id }

export function parseChain(value: string | null): Step[] {
  return (value ?? '')
    .split(',')
    .filter(Boolean)
    .map((step) => {
      const [key, id] = step.split(':')
      return { key, id }
    })
    .filter((step) => step.key && step.id)
}

export const formatChain = (chain: Step[]) =>
  chain.map((step) => `${step.key}:${step.id}`).join(',')

/** A collection reached from this one through its sections (or this one), by key. */
export function findCollection(
  root: AnyCollection,
  key: string,
): AnyCollection | undefined {
  const seen = new Set<string>()
  const queue = [root]
  while (queue.length) {
    const current = queue.shift()!
    if (current.key === key) return current
    if (seen.has(current.key)) continue
    seen.add(current.key)
    for (const section of current.panel?.sections ?? [])
      queue.push(section.collection())
  }
  return undefined
}

/** A record on the way, with its collection and its context. */
export type ChainStep = Step & { collection: AnyCollection; context: unknown }

/** A context not known yet: its parent record is loading. */
const PENDING = Symbol('pending')

/**
 * The records on the way to the linked record shown, each with its collection and its
 * context (notice 3, decided 2026-11-23): the record opened from the list has the
 * list's context; each linked one gets the context its parent's section gives it
 * (`SectionDefinition.context`), from the parent record, so the address needs only
 * keys and ids. `ready` is false while a parent record a context needs is loading.
 */
export function useChain(
  root: AnyCollection,
  rootContext: unknown,
  openId: Id | null,
  chain: Step[],
) {
  const steps = openId ? [{ key: root.key, id: openId }, ...chain] : []
  const collections = steps.map((step, depth) =>
    depth === 0 ? root : (findCollection(root, step.key) ?? root),
  )
  // ponytail: a parent with two sections of the same collection takes the first's
  // context; name the section in the address if that case appears.
  const sections = steps.map((step, depth) =>
    depth === 0
      ? undefined
      : collections[depth - 1].panel?.sections?.find(
          (section) => section.collection().key === step.key,
        ),
  )
  // Contexts come down the chain: each from its parent record, read from the cache
  // with the parent's own context. A parent not loaded yet leaves the rest pending;
  // its query below loads it, and the chain is worked out again.
  const client = useQueryClient()
  const contexts: unknown[] = []
  for (let depth = 0; depth < steps.length; depth++) {
    const give = sections[depth]?.context
    const above = contexts[depth - 1]
    if (depth === 0) contexts.push(rootContext)
    else if (!give) contexts.push(undefined)
    else if (above === PENDING) contexts.push(PENDING)
    else {
      const parent = client.getQueryData(
        keys.record(collections[depth - 1].key, steps[depth - 1].id, above),
      )
      contexts.push(parent === undefined ? PENDING : give(parent, above))
    }
  }
  useQueries({
    queries: steps.slice(0, -1).map((step, depth) => ({
      queryKey: keys.record(collections[depth].key, step.id, contexts[depth]),
      queryFn: () => collections[depth].source.one(step.id, contexts[depth]),
      // Only a parent whose child's context it gives, once its own is known.
      enabled:
        Boolean(sections[depth + 1]?.context) && contexts[depth] !== PENDING,
    })),
  })
  const ready = !contexts.includes(PENDING)
  const shown: ChainStep[] = steps.map((step, depth) => ({
    ...step,
    collection: collections[depth],
    context: contexts[depth],
  }))
  return { steps: shown, ready }
}

/** Set by the collection around its panel: a section's record opens in the panel. */
export const OpenLinked = createContext<((key: string, id: Id) => void) | null>(
  null,
)
export const useOpenLinked = () => useContext(OpenLinked)
