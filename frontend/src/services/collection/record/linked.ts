import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '../../notifications'
import { cache } from '../data/collectionQuery'
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

/**
 * Changing a linked record of any collection: the change goes through its own data
 * source and cache, and a refused or failed one is a message (decision 132).
 */
// ponytail: no keep-place nor 403/404 handling here (the list's own records have
// them); add them when a linked collection needs them.
export function useLinkedEditing(linked: AnyCollection) {
  const queryClient = useQueryClient()
  const { t } = useTranslation([linked.i18n.namespace, 'collection'])
  const canEdit = useCallback(
    (record: unknown, id: string) =>
      !linked.rights || linked.rights(record, undefined).edit.includes(id),
    [linked],
  )
  const save = useCallback(
    async (
      record: unknown,
      patch: Partial<unknown>,
      field?: { label: string; quiet?: boolean },
    ) => {
      const id = linked.getId(record)
      try {
        if (!linked.source.update)
          throw new Error(`${linked.key} cannot be edited`)
        const updated = await linked.source.update(id, patch, undefined)
        cache.updated(queryClient, linked.key, updated, linked.getId)
        void cache.refresh(queryClient, linked.key)
      } catch (refusal) {
        if (field && !field.quiet)
          notify({
            tone: 'error',
            text: t('collection:message.notSaved', {
              field: field.label,
              name: linked.panel?.title(record) ?? id,
            }),
            scope: `${linked.key}:record:${id}`,
          })
        throw refusal
      }
    },
    [linked, queryClient, t],
  )
  const report = useCallback(
    (record: unknown, _field: string, reason: string) =>
      notify({
        tone: 'error',
        text: t('collection:message.putBack', { reason }),
        scope: `${linked.key}:record:${linked.getId(record)}`,
      }),
    [linked, t],
  )
  return { canEdit, save, report }
}
