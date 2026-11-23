import { useQueries } from '@tanstack/react-query'
import { keys } from '../data/collectionQuery'
import { Folds } from '../drill/Folded'
import type { ChainStep } from './linked'

/**
 * The records left on the way to the linked record shown (decision 137): the one
 * opened from the list, then each linked one but the last, folded into tabs before
 * the panel. A tab opens its record again; the tabs after it go.
 */
export function LinkedTabs({
  steps,
  onOpen,
}: {
  /** The records left, from the one opened from the list (`useChain`). */
  steps: ChainStep[]
  /** Shows the record at this depth: 0 is the one opened from the list. */
  onOpen: (depth: number) => void
}) {
  const entries = steps
  // Records just seen: their names come from the cache, read in their context.
  const records = useQueries({
    queries: entries.map((entry) => ({
      queryKey: keys.record(entry.collection.key, entry.id, entry.context),
      queryFn: () => entry.collection.source.one(entry.id, entry.context),
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
