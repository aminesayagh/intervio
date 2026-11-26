import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import {
  createLoader,
  createSerializer,
  parseAsString,
  useQueryStates,
} from '../../navigation'
import { listParsers, sortParser } from '../address'
import {
  applied,
  formatSort,
  plainOf,
  ruleCount,
  type FilterGroup,
} from '../listing/rules'
import type { ViewDefinition } from '../definition'
import type { Sort } from '../types'
import { DEFAULT_VIEW } from '../views/views'

/**
 * The list as the person set it: search, filter rules (see `listing/rules`), and the
 * sort levels they chose, or none for the collection's default order.
 */
export type Listing = {
  search: string
  filters: Record<string, string[]>
  /** Composed rules the plain filters can't say: "or", groups (decision 161). */
  where: FilterGroup | null
  sort: Sort[]
}

/** True when a search or a filter narrows the list. */
export const isNarrowed = (listing: Listing) =>
  listing.search.trim() !== '' ||
  Object.values(listing.filters).some((values) => values.length > 0) ||
  (listing.where !== null && ruleCount(listing.where) > 0)

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
    views = [DEFAULT_VIEW],
  }: {
    /** The collection's rule keys and scope ids: their f.{key} parameters. */
    filters?: string[]
    /** Filters "Clear filters" keeps: the scopes, which only their chip removes. */
    kept?: string[]
    /** The collection's views in order (`viewsOf`); the first is the default. */
    views?: ViewDefinition[]
  } = {},
) {
  const tabKey = `intervio.collection.${key}.list`
  const sortKey = `intervio.collection.${key}.sort`
  const viewKey = `intervio.collection.${key}.view`
  const ids = filters.join(',')
  const keptIds = kept.join(',')
  const parsers = useMemo(
    () => ({
      ...listParsers(ids ? ids.split(',') : []),
      open: parseAsString,
      new: parseAsString,
      view: parseAsString,
    }),
    [ids],
  )
  const [values, setValues] = useQueryStates(parsers)
  /** The options chosen in a filter (its f.{id} parameter). */
  const chosen = (id: string) =>
    (values as Record<string, unknown>)[`f.${id}`] as string[]

  // The view shown (decision 168): the address's, else the first; an unknown one
  // (an old link) is the first too.
  const view = views.find((one) => one.id === values.view) ?? views[0]
  /** The address's list parameters as a view starts them: its filters and sort, or none. */
  const startOf = useCallback(
    (next: ViewDefinition, sort: Sort[] | null = null) => ({
      q: '',
      // Locked filters and sort stay out of the address: `query` adds them.
      filter: next.filtersEditable === false ? null : (next.where ?? null),
      ...Object.fromEntries(
        (ids ? ids.split(',') : [])
          .filter((id) => !keptIds.split(',').includes(id))
          .map((id) => [
            `f.${id}`,
            next.filtersEditable === false ? [] : (next.filters?.[id] ?? []),
          ]),
      ),
      sort:
        next.sortEditable === false
          ? null
          : next.sort?.length
            ? next.sort
            : sort,
      // The default view keeps the address bare.
      view: next.id === views[0].id ? null : next.id,
    }),
    [ids, keptIds, views],
  )

  // A bare address takes back the tab's last list state; else the view used last in
  // this browser (or the one the address names) opens with its filters and sort, or
  // at least the last sort chosen.
  useLayoutEffect(() => {
    const listed =
      values.q !== '' ||
      values.sort.length > 0 ||
      values.filter !== null ||
      filters.some((id) => chosen(id).length > 0)
    if (listed) return
    const saved = read(() => sessionStorage, tabKey)
    const lastSort = sortParser.parse(read(() => localStorage, sortKey) ?? '')
    if (saved !== null && values.view === null) {
      const restored = createLoader(parsers)(`?${saved}`)
      // The record open last comes back too, unless the address names one (or a new one).
      const open = values.open ?? (values.new ? null : restored.open)
      void setValues({ ...restored, open, new: values.new })
      return
    }
    const last = read(() => localStorage, viewKey)
    const opened =
      views.find((one) => one.id === values.view) ??
      views.find((one) => one.id === last) ??
      views[0]
    const start = startOf(opened, lastSort)
    // The default view with nothing to set leaves the address alone.
    if (start.view !== null || start.sort || start.filter || opened.filters)
      void setValues(start)
    // Only when the collection opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The browser remembers the view used last, for the next bare address.
  useEffect(
    () => write(() => localStorage, viewKey, view.id),
    [view.id, viewKey],
  )
  /** Shows another view: the list starts again from its filters and sort; the panel stays. */
  const setView = useCallback(
    (id: string) => {
      const next = views.find((one) => one.id === id)
      if (next) void setValues(startOf(next))
    },
    [views, setValues, startOf],
  )

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
      where: values.filter,
      sort: values.sort,
    }),
    [values, ids],
  )
  // What the data source is asked: the person's listing, with the view's locked
  // filters (the scopes stay) and sort in place of theirs (MOH-33).
  const query = useMemo(() => {
    const kept = keptIds.split(',')
    const filters =
      view.filtersEditable === false
        ? {
            ...Object.fromEntries(
              Object.entries(listing.filters).filter(([id]) =>
                kept.includes(id),
              ),
            ),
            ...view.filters,
          }
        : listing.filters
    const where =
      view.filtersEditable === false ? (view.where ?? null) : listing.where
    const sort = view.sortEditable === false ? (view.sort ?? []) : listing.sort
    return {
      ...listing,
      filters,
      where,
      sort: sort.length ? sort : [defaultSort],
    }
  }, [listing, defaultSort, view, keptIds])

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
  /**
   * Sets the Filter menu's rules: as plain `f.{key}` when they can be written so, else
   * as one `filter` (decision 161). The scopes stay as they are.
   */
  const setRules = useCallback(
    (group: FilterGroup) => {
      const kept = keptIds.split(',')
      const plain = plainOf(group)
      void setValues({
        ...Object.fromEntries(
          (ids ? ids.split(',') : [])
            .filter((id) => !kept.includes(id))
            .map((id) => [`f.${id}`, plain?.[id] ?? []]),
        ),
        filter: plain ? null : applied(group),
      })
    },
    [setValues, ids, keptIds],
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
        filter: null,
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
    /** The view shown, and how to show another. */
    view,
    setView,
    listing,
    query,
    setSearch,
    setFilters,
    setRules,
    clear,
    /** The sort levels chosen, or none to go back to the default order. */
    setSort,
  }
}
