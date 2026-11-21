import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { setSearchParams, useSearchParams } from '../navigation'
import type { ListQuery, SortDirection } from './types'

export type Listing = Omit<ListQuery, 'cursor'>
type Sort = Listing['sort']

/** The address parameters that describe a list (spec 6.1); others (open, new) are kept as they are. */
const isListParam = (name: string) =>
  name === 'q' || name === 'sort' || name.startsWith('f.')

const sameSort = (a: Sort, b: Sort) =>
  a.by === b.by && a.direction === b.direction

function parseSort(value: string | null): Sort | null {
  const [by, direction] = value?.split(':') ?? []
  return by && (direction === 'asc' || direction === 'desc')
    ? { by, direction: direction as SortDirection }
    : null
}

/** Reads the list's state from an address; missing values take their defaults. */
export function readListing(
  params: URLSearchParams,
  defaultSort: Sort,
): Listing {
  const filters: Record<string, string[]> = {}
  for (const [name, value] of params)
    if (name.startsWith('f.') && value)
      filters[name.slice(2)] = value.split(',').filter(Boolean)
  return {
    search: params.get('q') ?? '',
    filters,
    sort: parseSort(params.get('sort')) ?? defaultSort,
  }
}

/** Writes a list's state into an address, leaving defaults out and other parameters alone. */
export function writeListing(
  params: URLSearchParams,
  listing: Listing,
  defaultSort: Sort,
) {
  const next = new URLSearchParams(
    [...params].filter(([name]) => !isListParam(name)),
  )
  if (listing.search.trim()) next.set('q', listing.search.trim())
  for (const [id, values] of Object.entries(listing.filters))
    if (values.length) next.set(`f.${id}`, values.join(','))
  if (!sameSort(listing.sort, defaultSort))
    next.set('sort', `${listing.sort.by}:${listing.sort.direction}`)
  return next
}

/** True when a search or a filter narrows the list. */
export const isNarrowed = (listing: Listing) =>
  listing.search.trim() !== '' ||
  Object.values(listing.filters).some((values) => values.length > 0)

function read(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key)
  } catch {
    return null // storage blocked: nothing remembered
  }
}
function write(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value)
  } catch {
    // storage blocked: not remembered, the address still holds the state
  }
}

/**
 * The list's search, filters and sort, kept in the address (spec 6). Changing them
 * replaces the address (no history entry). The browser tab remembers the last list
 * state, which comes back when the collection is opened on a bare address (6.2); the
 * browser remembers the last sort chosen.
 */
export function useCollectionState(key: string, defaultSort: Sort) {
  const params = useSearchParams()
  const query = params.toString()
  const tabKey = `intervio.collection.${key}.list`
  const sortKey = `intervio.collection.${key}.sort`

  // A bare address takes back the tab's last list state, or at least the last sort.
  useLayoutEffect(() => {
    const current = new URLSearchParams(window.location.search)
    if ([...current.keys()].some(isListParam)) return
    const saved = read(() => sessionStorage, tabKey)
    const lastSort = parseSort(read(() => localStorage, sortKey))
    const restored = saved
      ? readListing(new URLSearchParams(saved), defaultSort)
      : lastSort
        ? { search: '', filters: {}, sort: lastSort }
        : null
    if (restored)
      setSearchParams(writeListing(current, restored, defaultSort), {
        replace: true,
      })
    // Only when the collection opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The tab remembers the list it shows, however it got there (toolbar or address).
  useEffect(() => {
    const list = new URLSearchParams(query)
    write(
      () => sessionStorage,
      tabKey,
      new URLSearchParams(
        [...list].filter(([name]) => isListParam(name)),
      ).toString(),
    )
  }, [query, tabKey])

  const listing = useMemo(
    () => readListing(new URLSearchParams(query), defaultSort),
    [query, defaultSort],
  )

  const change = useCallback(
    (next: Listing) => {
      const params = writeListing(
        new URLSearchParams(window.location.search),
        next,
        defaultSort,
      )
      setSearchParams(params, { replace: true })
    },
    [defaultSort],
  )

  return {
    listing,
    setSearch: (search: string) => change({ ...listing, search }),
    setFilter: (id: string, values: string[]) =>
      change({ ...listing, filters: { ...listing.filters, [id]: values } }),
    clear: () => change({ ...listing, search: '', filters: {} }),
    setSort: (sort: Sort) => {
      write(() => localStorage, sortKey, `${sort.by}:${sort.direction}`)
      change({ ...listing, sort })
    },
  }
}
