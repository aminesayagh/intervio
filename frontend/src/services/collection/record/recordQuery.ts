import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError } from '../../http'
import { keys } from '../data/collectionQuery'
import type { CollectionDefinition, PanelDefinition } from '../definition'
import type { Id } from '../types'

/** A record removed, or that the person can no longer see (spec 7.2). */
export const isUnavailable = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 403)

/**
 * One record, for the panel or the full page: the list's copy shows at once (when
 * there is one), then the server's. A removed record is reported, so it leaves the list.
 */
export function useRecord<T, C>({
  definition,
  context,
  id,
  fromList,
  onUnavailable,
}: {
  definition: CollectionDefinition<T, C>
  context: C
  id: Id
  fromList?: T
  onUnavailable?: (id: Id) => void
}) {
  const query = useQuery<T, Error, T, readonly unknown[]>({
    queryKey: keys.record(definition.key, id),
    queryFn: () => definition.source.one(id, context),
    // A record is never a function, but TanStack can't know it of a generic type.
    placeholderData: () => fromList as never,
    retry: (failures, error) => !isUnavailable(error) && failures < 1,
  })
  const unavailable = query.isError && isUnavailable(query.error)
  useEffect(() => {
    if (unavailable) onUnavailable?.(id)
  }, [unavailable, id, onUnavailable])
  return { query, record: query.data, unavailable }
}

/** Whether a person may change nothing on a record (the "View only" note). */
export function isViewOnly<T>(
  panel: PanelDefinition<T>,
  record: T,
  canEdit: (record: T, id: string) => boolean,
) {
  const editable = [
    ...(panel.titleEdit ? ['title'] : []),
    ...panel.properties
      .filter((property) => property.edit || property.choose)
      .map((property) => property.id),
    ...(panel.description ? ['description'] : []),
  ]
  return !editable.some((id) => canEdit(record, id))
}

/** Where the tab keeps a new record's input (spec 6.1); its presence means "typed". */
export const newRecordKey = (key: string) => `intervio.collection.${key}.new`
