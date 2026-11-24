import { ApiError } from '../../http'
import { passes, type FilterValue } from '../listing/rules'
import type { DataSource, Id, ListQuery, Page } from '../types'

type Options<T> = {
  /** The text a search looks in (name and description, as on the backend). */
  searchText: (item: T) => string
  /** The value of an item for a filter id, or several values (a list of linked ids). */
  filterValue?: (item: T, filterId: string) => FilterValue
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
  /** Records a change on several refuses (403), one by one (tests). */
  refused: Set<Id>
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
    refused: new Set(),
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

  function list(query: ListQuery): Page<T> {
    const search = query.search.trim().toLowerCase()
    // A key per level, then the id (in the last level's direction): a total order.
    const signs = query.sort.map((level) => (level.direction === 'asc' ? 1 : -1))
    const key = (item: T): (string | number)[] => [
      ...query.sort.map((level) => options.sortValue(item, level.by)),
      item.id,
    ]
    const order = (a: (string | number)[], b: (string | number)[]) => {
      for (let i = 0; i < a.length; i++)
        if (a[i] !== b[i])
          return (signs[i] ?? signs[signs.length - 1]) * (a[i] < b[i] ? -1 : 1)
      return 0
    }
    const matching = items
      .filter((item) => !archived.has(item.id))
      .filter(
        (item) =>
          !search || options.searchText(item).toLowerCase().includes(search),
      )
      .filter((item) =>
        passes(query.filters, (id) => options.filterValue?.(item, id)),
      )
      .sort((a, b) => order(key(a), key(b)))

    // Pages by cursor (spec 11): a cursor is a record's sort value and id, so a page
    // starts right after (or ends right before) it, whatever changed since.
    const cursor = query.cursor
      ? (JSON.parse(atob(query.cursor)) as (string | number)[])
      : null
    const encode = (item: T | undefined) =>
      item ? btoa(JSON.stringify(key(item))) : null
    let start: number
    let page: T[]
    if (cursor && query.direction === 'before') {
      const end = matching.findIndex(
        (item) => order(key(item), cursor) >= 0,
      )
      const stop = end === -1 ? matching.length : end
      start = Math.max(0, stop - pageSize)
      page = matching.slice(start, stop)
    } else {
      start = cursor
        ? matching.findIndex((item) => order(key(item), cursor) > 0)
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
    updateMany: (ids, patch) =>
      answer(() => {
        const updated: T[] = []
        const failed: { id: Id; code: string }[] = []
        for (const id of ids) {
          const item = items.find((candidate) => candidate.id === id)
          if (settings.forbidden || settings.refused.has(id))
            failed.push({ id, code: 'ERROR_FORBIDDEN' })
          else if (!item || archived.has(id))
            failed.push({ id, code: 'ERROR_NOT_FOUND' })
          else updated.push({ ...item, ...patch, id })
        }
        const changed = new Map(updated.map((item) => [item.id, item]))
        items = items.map((item) => changed.get(item.id) ?? item)
        return { updated, failed }
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
