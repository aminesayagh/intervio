import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import type { DataSource, Id, ListQuery, Page } from '../types'

type Listing = Omit<ListQuery, 'cursor'>

/** Cache keys (spec 8.1): every list of a collection starts with [key, 'list']. */
export const keys = {
  lists: (key: string) => [key, 'list'] as const,
  list: (key: string, context: unknown, listing: Listing) =>
    [
      key,
      'list',
      context ?? null,
      listing.search,
      listing.filters,
      listing.sort,
    ] as const,
  /** A record as one context shows it (its values and rights there). */
  record: (key: string, id: Id, context?: unknown) =>
    [key, 'one', id, context ?? null] as const,
  /** A record in every context. */
  records: (key: string, id: Id) => [key, 'one', id] as const,
}

/**
 * The list's records, loaded page by page through the collection's data source.
 * `items` is every loaded record in order; `total` comes from the first page.
 */
export function useCollectionQuery<T, C>({
  key,
  source,
  context,
  listing,
}: {
  key: string
  source: DataSource<T, C>
  context: C
  listing: Listing
}) {
  const query = useInfiniteQuery({
    queryKey: keys.list(key, context, listing),
    queryFn: ({ pageParam }) =>
      source.list({ ...listing, cursor: pageParam }, context),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // One quiet retry, then the list shows Retry (spec 8.1); never a loop.
    retry: 1,
    retryDelay: 400,
  })
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )
  return { ...query, items, total: query.data?.pages[0]?.total }
}

type Pages<T> = InfiniteData<Page<T>, string | null>

function withTotal<T>(data: Pages<T>, change: number): Pages<T> {
  const [first, ...rest] = data.pages
  if (!first || first.total === undefined) return data
  return {
    ...data,
    pages: [{ ...first, total: first.total + change }, ...rest],
  }
}

/**
 * Keeps the loaded pages right after a change (spec 8.3), without waiting for a reload.
 * A created record goes on top of the list it was created in, even if a filter would
 * hide it, until the filters change; an edit or a removal touches every loaded list.
 */
export const cache = {
  created<T>(client: QueryClient, listKey: readonly unknown[], record: T) {
    client.setQueryData<Pages<T>>(listKey, (data) => {
      if (!data?.pages.length) return data
      const [first, ...rest] = data.pages
      return withTotal(
        {
          ...data,
          pages: [{ ...first, items: [record, ...first.items] }, ...rest],
        },
        1,
      )
    })
  },

  updated<T>(
    client: QueryClient,
    key: string,
    record: T,
    getId: (record: T) => Id,
    /** The context it was saved from (spec 4). */
    context?: unknown,
  ) {
    const id = getId(record)
    // In the context it was saved from; lists and records of other contexts reload
    // (cache.refresh, and below), as they may show it with other rights.
    client.setQueriesData<Pages<T>>(
      { queryKey: [...keys.lists(key), context ?? null] },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              getId(item) === id ? record : item,
            ),
          })),
        },
    )
    client.setQueryData(keys.record(key, id, context), record)
    void client.invalidateQueries({
      queryKey: keys.records(key, id),
      predicate: (query) => query.queryKey[3] !== (context ?? null),
    })
  },

  removed<T>(
    client: QueryClient,
    key: string,
    id: Id,
    getId: (record: T) => Id,
    /** Keep the record's own query (the panel showing it says it is unavailable). */
    { keepRecord = false } = {},
  ) {
    client.setQueriesData<Pages<T>>({ queryKey: keys.lists(key) }, (data) => {
      if (!data) return data
      const found = data.pages.some((page) =>
        page.items.some((item) => getId(item) === id),
      )
      if (!found) return data
      const pages = data.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => getId(item) !== id),
      }))
      return withTotal({ ...data, pages }, -1)
    })
    if (!keepRecord) client.removeQueries({ queryKey: keys.records(key, id) })
  },

  /** Reloads the loaded lists in the background, so a changed sort position shows. */
  refresh(client: QueryClient, key: string) {
    return client.invalidateQueries({ queryKey: keys.lists(key) })
  },
}
