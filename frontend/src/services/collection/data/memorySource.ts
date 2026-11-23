import { ApiError } from '../../http'
import type { DataSource, Id, ListQuery, Page } from '../types'

type Options<T> = {
  /** The text a search looks in (name and description, as on the backend). */
  searchText: (item: T) => string
  /** The value of an item for a filter id, or several values (a list of linked ids). */
  filterValue?: (item: T, filterId: string) => string | string[] | undefined
  /** The value an item is sorted by, for a sort id. */
  sortValue: (item: T, by: string) => string | number
  pageSize?: number
}

/** Knobs the showcase page turns to see the loading and error states. */
export type MemorySettings = {
  latencyMs: number
  /** The next request fails once (tests). */
  failNext: boolean
  /** Every request fails until this is turned off (the showcase: the app retries a failed request). */
  failing: boolean
  /** Changes are refused as no longer allowed (403), until this is turned off. */
  forbidden: boolean
}

/**
 * A data source kept in memory: the test collection's backend, for the tests and the
 * showcase page. It pages like the recommended backend (keyset: the sort value and the
 * id of the last item), so a record added between two pages never shifts the next one.
 */
export function memorySource<T extends { id: Id }>(
  initial: T[],
  options: Options<T>,
): DataSource<T> & { settings: MemorySettings; items: () => T[] } {
  let items = [...initial]
  const archived = new Set<Id>()
  const settings: MemorySettings = {
    latencyMs: 0,
    failNext: false,
    failing: false,
    forbidden: false,
  }
  const pageSize = options.pageSize ?? 30

  async function answer<R>(work: () => R): Promise<R> {
    if (settings.latencyMs)
      await new Promise((done) => setTimeout(done, settings.latencyMs))
    if (settings.failNext || settings.failing) {
      settings.failNext = false
      throw new ApiError(500, 'ERROR_UNKNOWN')
    }
    return work()
  }

  function find(id: Id) {
    const item = items.find((candidate) => candidate.id === id)
    if (!item || archived.has(id)) throw new ApiError(404, 'ERROR_NOT_FOUND')
    return item
  }

  function compare(a: [string | number, Id], b: [string | number, Id]) {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1
    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
  }

  function list(query: ListQuery): Page<T> {
    const search = query.search.trim().toLowerCase()
    const sign = query.sort.direction === 'asc' ? 1 : -1
    const key = (item: T): [string | number, Id] => [
      options.sortValue(item, query.sort.by),
      item.id,
    ]
    const matching = items
      .filter((item) => !archived.has(item.id))
      .filter(
        (item) =>
          !search || options.searchText(item).toLowerCase().includes(search),
      )
      .filter((item) =>
        Object.entries(query.filters).every(([filterId, chosen]) => {
          if (chosen.length === 0) return true
          const value = options.filterValue?.(item, filterId)
          const values = Array.isArray(value) ? value : [value]
          return values.some((v) => v !== undefined && chosen.includes(v))
        }),
      )
      .sort((a, b) => sign * compare(key(a), key(b)))

    // Pages by cursor (spec 11): a cursor is a record's sort value and id, so a page
    // starts right after (or ends right before) it, whatever changed since.
    const cursor = query.cursor
      ? (JSON.parse(atob(query.cursor)) as [string | number, Id])
      : null
    const encode = (item: T | undefined) =>
      item ? btoa(JSON.stringify(key(item))) : null
    let start: number
    let page: T[]
    if (cursor && query.direction === 'before') {
      const end = matching.findIndex(
        (item) => sign * compare(key(item), cursor) >= 0,
      )
      const stop = end === -1 ? matching.length : end
      start = Math.max(0, stop - pageSize)
      page = matching.slice(start, stop)
    } else {
      start = cursor
        ? matching.findIndex((item) => sign * compare(key(item), cursor) > 0)
        : 0
      if (start === -1) start = matching.length
      page = matching.slice(start, start + pageSize)
    }
    const end = start + page.length
    return {
      items: page,
      nextCursor: end < matching.length ? encode(page[page.length - 1]) : null,
      previousCursor: start > 0 ? encode(page[0]) : null,
      total: matching.length,
    }
  }

  return {
    settings,
    items: () => items,
    list: (query) => answer(() => list(query)),
    one: (id) => answer(() => find(id)),
    create: (values) =>
      answer(() => {
        const item = { ...values, id: crypto.randomUUID() } as T
        items = [item, ...items]
        return item
      }),
    update: (id, patch) =>
      answer(() => {
        if (settings.forbidden) throw new ApiError(403, 'ERROR_FORBIDDEN')
        const updated = { ...find(id), ...patch, id }
        items = items.map((item) => (item.id === id ? updated : item))
        return updated
      }),
    remove: (id) =>
      answer(() => {
        find(id)
        items = items.filter((item) => item.id !== id)
      }),
    archive: (id) =>
      answer(() => {
        find(id)
        archived.add(id)
      }),
    restore: (id) =>
      answer(() => {
        archived.delete(id)
      }),
  }
}
