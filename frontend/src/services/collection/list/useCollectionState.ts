import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import {
  createLoader,
  createSerializer,
  parseAsString,
  useQueryStates,
} from '../../navigation'
import { listParsers, sortParser } from '../address'
import { formatSort } from '../listing/rules'
import type { Sort } from '../types'

/**
 * The list as the person set it: search, filter rules (see `listing/rules`), and the
 * sort levels they chose, or none for the collection's default order.
 */
export type Listing = {
  search: string
  filters: Record<string, string[]>
  sort: Sort[]
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
 * The list's search, filters and sort, kept in the address (spec 6) through nuqs.
 * Changing them replaces the address (no history entry). The browser tab remembers the
 * last list state, which comes back when the collection is opened on a bare address
 * (6.2); the browser remembers the last sort chosen. `query` is what the data source
 * is asked: the listing, with the default order when no sort is chosen.
 */
export function useCollectionState(
  key: string,
  defaultSort: Sort,
  {
    filters = [],
    kept = [],
  }: {
    /** The collection's rule keys and scope ids: their f.{key} parameters. */
    filters?: string[]
    /** Filters "Clear filters" keeps: the scopes, which only their chip removes. */
    kept?: string[]
  } = {},
) {
  const tabKey = `intervio.collection.${key}.list`
  const sortKey = `intervio.collection.${key}.sort`
  const ids = filters.join(',')
  const keptIds = kept.join(',')
  const parsers = useMemo(
    () => ({
      ...listParsers(ids ? ids.split(',') : []),
      open: parseAsString,
      new: parseAsString,
    }),
    [ids],
  )
  const [values, setValues] = useQueryStates(parsers)
  /** The options chosen in a filter (its f.{id} parameter). */
  const chosen = (id: string) =>
    (values as Record<string, unknown>)[`f.${id}`] as string[]

  // A bare address takes back the tab's last list state, or at least the last sort.
  useLayoutEffect(() => {
    const listed =
      values.q !== '' ||
      values.sort.length > 0 ||
      filters.some((id) => chosen(id).length > 0)
    if (listed) return
    const saved = read(() => sessionStorage, tabKey)
    const lastSort = sortParser.parse(read(() => localStorage, sortKey) ?? '')
    if (saved !== null) {
      const restored = createLoader(parsers)(`?${saved}`)
      // The record open last comes back too, unless the address names one (or a new one).
      const open = values.open ?? (values.new ? null : restored.open)
      void setValues({ ...restored, open, new: values.new })
    } else if (lastSort) void setValues({ sort: lastSort })
    // Only when the collection opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The tab remembers the list it shows, however it got there (toolbar or address).
  const remembered = useMemo(
    () =>
      createSerializer(parsers)({ ...values, new: null }).replace(/^\?/, ''),
    [parsers, values],
  )
  useEffect(
    () => write(() => sessionStorage, tabKey, remembered),
    [remembered, tabKey],
  )

  const listing = useMemo<Listing>(
    () => ({
      search: values.q,
      filters: Object.fromEntries(
        (ids ? ids.split(',') : [])
          .map((id) => [
            id,
            (values as Record<string, unknown>)[`f.${id}`] as string[],
          ])
          .filter(([, options]) => options.length > 0),
      ),
      sort: values.sort,
    }),
    [values, ids],
  )
  const query = useMemo(
    () => ({
      ...listing,
      sort: listing.sort.length ? listing.sort : [defaultSort],
    }),
    [listing, defaultSort],
  )

  /** Sets several filter rules at once (an empty list removes one). */
  const setFilters = useCallback(
    (patch: Record<string, string[]>) =>
      void setValues(
        Object.fromEntries(
          Object.entries(patch).map(([key, chosen]) => [`f.${key}`, chosen]),
        ),
      ),
    [setValues],
  )
  const setSort = useCallback(
    (sort: Sort[]) => {
      write(() => localStorage, sortKey, sort.length ? formatSort(sort) : null)
      void setValues({ sort: sort.length ? sort : null })
    },
    [setValues, sortKey],
  )
  const setSearch = useCallback(
    (search: string) => void setValues({ q: search.trim() }),
    [setValues],
  )
  const clear = useCallback(
    () =>
      void setValues({
        q: '',
        ...Object.fromEntries(
          (ids ? ids.split(',') : [])
            .filter((id) => !keptIds.split(',').includes(id))
            .map((id) => [`f.${id}`, []]),
        ),
      }),
    [setValues, ids, keptIds],
  )
  // The same functions from one render to the next: the table doesn't render again.
  return {
    listing,
    query,
    setSearch,
    setFilters,
    clear,
    /** The sort levels chosen, or none to go back to the default order. */
    setSort,
  }
}
