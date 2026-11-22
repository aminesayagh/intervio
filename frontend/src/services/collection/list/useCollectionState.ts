import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { setSearchParams, useSearchParams } from '../../navigation'
import type { ListQuery, SortDirection } from '../types'

type Sort = ListQuery['sort']

/**
 * The list as the person set it: search, filters, and the sort they chose, or null
 * for the collection's default order (no header marked, nothing in the address).
 */
export type Listing = {
  search: string
  filters: Record<string, string[]>
  sort: Sort | null
}

/** The address parameters that describe a list (spec 6.1); others (open, new) are kept as they are. */
const isListParam = (name: string) =>
  name === 'q' || name === 'sort' || name.startsWith('f.')

function parseSort(value: string | null): Sort | null {
  const [by, direction] = value?.split(':') ?? []
  return by && (direction === 'asc' || direction === 'desc')
    ? { by, direction: direction as SortDirection }
    : null
}

/** Reads the list's state from an address. */
export function readListing(params: URLSearchParams): Listing {
  const filters: Record<string, string[]> = {}
  for (const [name, value] of params)
    if (name.startsWith('f.') && value)
      filters[name.slice(2)] = value.split(',').filter(Boolean)
  return {
    search: params.get('q') ?? '',
    filters,
    sort: parseSort(params.get('sort')),
  }
}

/** Writes a list's state into an address, leaving empty values out and other parameters alone. */
export function writeListing(params: URLSearchParams, listing: Listing) {
  const next = new URLSearchParams(
    [...params].filter(([name]) => !isListParam(name)),
  )
  if (listing.search.trim()) next.set('q', listing.search.trim())
  for (const [id, values] of Object.entries(listing.filters))
    if (values.length) next.set(`f.${id}`, values.join(','))
  if (listing.sort)
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
function write(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key)
    else storage().setItem(key, value)
  } catch {
    // storage blocked: not remembered, the address still holds the state
  }
}

/**
 * The list's search, filters and sort, kept in the address (spec 6). Changing them
 * replaces the address (no history entry). The browser tab remembers the last list
 * state, which comes back when the collection is opened on a bare address (6.2); the
 * browser remembers the last sort chosen. `query` is what the data source is asked:
 * the listing, with the default order when no sort is chosen.
 */
export function useCollectionState(key: string, defaultSort: Sort) {
  const params = useSearchParams()
  const address = params.toString()
  const tabKey = `intervio.collection.${key}.list`
  const sortKey = `intervio.collection.${key}.sort`

  // A bare address takes back the tab's last list state, or at least the last sort.
  useLayoutEffect(() => {
    const current = new URLSearchParams(window.location.search)
    if ([...current.keys()].some(isListParam)) return
    const saved = read(() => sessionStorage, tabKey)
    const lastSort = parseSort(read(() => localStorage, sortKey))
    const savedParams = new URLSearchParams(saved ?? '')
    const restored = saved
      ? readListing(savedParams)
      : lastSort
        ? { search: '', filters: {}, sort: lastSort }
        : null
    if (!restored) return
    const next = writeListing(current, restored)
    // The record open last comes back too, unless the address names one (or a new one).
    const open = savedParams.get('open')
    if (open && !current.has('open') && !current.has('new'))
      next.set('open', open)
    setSearchParams(next, { replace: true })
    // Only when the collection opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The tab remembers the list it shows, however it got there (toolbar or address).
  useEffect(() => {
    const list = new URLSearchParams(address)
    write(
      () => sessionStorage,
      tabKey,
      new URLSearchParams(
        [...list].filter(([name]) => isListParam(name) || name === 'open'),
      ).toString(),
    )
  }, [address, tabKey])

  const listing = useMemo(
    () => readListing(new URLSearchParams(address)),
    [address],
  )
  const query = useMemo(
    () => ({ ...listing, sort: listing.sort ?? defaultSort }),
    [listing, defaultSort],
  )

  const change = useCallback((next: Listing) => {
    setSearchParams(
      writeListing(new URLSearchParams(window.location.search), next),
      { replace: true },
    )
  }, [])

  return {
    listing,
    query,
    setSearch: (search: string) => change({ ...listing, search }),
    setFilter: (id: string, values: string[]) =>
      change({ ...listing, filters: { ...listing.filters, [id]: values } }),
    clear: () => change({ ...listing, search: '', filters: {} }),
    /** A sort chosen, or null to go back to the default order. */
    setSort: (sort: Sort | null) => {
      write(
        () => localStorage,
        sortKey,
        sort ? `${sort.by}:${sort.direction}` : null,
      )
      change({ ...listing, sort })
    },
  }
}
