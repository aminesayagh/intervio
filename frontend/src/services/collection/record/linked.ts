import { createContext, useContext } from 'react'
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

/** Set by the collection around its panel: a section's record opens in the panel. */
export const OpenLinked = createContext<((key: string, id: Id) => void) | null>(
  null,
)
export const useOpenLinked = () => useContext(OpenLinked)
