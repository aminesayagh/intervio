import { useQueries } from '@tanstack/react-query'
import { keys } from '../data/collectionQuery'
import type { AnyCollection } from '../definition'
import { Folds } from '../drill/Folded'
import type { Id } from '../types'
import { findCollection, type Step } from './linked'

/**
 * The records left on the way to the linked record shown (decision 137): the one
 * opened from the list, then each linked one but the last, folded into tabs before
 * the panel. A tab opens its record again; the tabs after it go.
 */
export function LinkedTabs({
  root,
  context,
  openId,
  chain,
  onOpen,
}: {
  root: AnyCollection
  context: unknown
  openId: Id
  chain: Step[]
  /** Shows the record at this depth: 0 is the one opened from the list. */
  onOpen: (depth: number) => void
}) {
  const entries = [{ key: root.key, id: openId }, ...chain.slice(0, -1)].map(
    (step) => ({ ...step, collection: findCollection(root, step.key) ?? root }),
  )
  // Records just seen: their names come from the cache.
  const records = useQueries({
    queries: entries.map((entry) => ({
      queryKey: keys.record(entry.collection.key, entry.id),
      queryFn: () =>
        entry.collection.source.one(
          entry.id,
          entry.collection === root ? context : undefined,
        ),
    })),
  })
  return (
    <Folds
      kind="records"
      folds={entries.map((entry, depth) => {
        const record = records[depth].data
        return {
          name:
            record !== undefined && entry.collection.panel
              ? entry.collection.panel.title(record)
              : '…',
          open: () => onOpen(depth),
        }
      })}
    />
  )
}
