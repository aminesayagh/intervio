import { api } from '../../http'
import type { DataSource, Id, ListQuery, Page } from '../types'

type Route = (id: Id) => string

/** Every convention of the default REST adapter can be overridden (spec 11.1). */
export type RestOptions<T, C> = {
  /** The collection's base path, fixed or built from the context. */
  path: string | ((context: C) => string)
  /**
   * Routes, relative to the base path unless they start with "/api/". Defaults:
   * list "", one "/{id}", create "", update "/{id}", remove "/{id}",
   * archive "/{id}/archive", restore "/{id}/restore".
   */
  routes?: {
    list?: string
    one?: Route
    create?: string
    update?: Route
    remove?: Route
    archive?: Route
    restore?: Route
  }
  /** Query parameter names. Defaults: q, cursor, limit, sort, and "f." before a filter id. */
  params?: {
    search?: string
    cursor?: string
    limit?: string
    sort?: string
    filterPrefix?: string
  }
  pageSize?: number
  /** The method that changes a record. Default PATCH. */
  updateMethod?: 'PATCH' | 'PUT' | 'POST'
  /** Turns a list response into a page. Default: the body is already { items, nextCursor, total }. */
  toPage?: (body: unknown) => Page<T>
  /** Turns a record response into a record. Default: the body is the record. */
  toRecord?: (body: unknown) => T
}

/** The query string of a list request: only what is set, so defaults stay out of the address. */
export function listParams(
  query: ListQuery,
  names: Required<NonNullable<RestOptions<unknown, unknown>['params']>>,
  pageSize: number,
) {
  const params = new URLSearchParams()
  if (query.search.trim()) params.set(names.search, query.search.trim())
  for (const [id, values] of Object.entries(query.filters))
    if (values.length) params.set(names.filterPrefix + id, values.join(','))
  params.set(names.sort, `${query.sort.by}:${query.sort.direction}`)
  if (query.cursor) params.set(names.cursor, query.cursor)
  params.set(names.limit, String(pageSize))
  return params
}

/**
 * The default data source: a collection's REST endpoints, called through the app's
 * `api` helper (session cookie, CSRF header, `ApiError`). Any call can still be
 * replaced: `{ ...restSource(options), list: myOwnList }`.
 */
export function restSource<T, C = void>(
  options: RestOptions<T, C>,
): DataSource<T, C> {
  const names = {
    search: 'q',
    cursor: 'cursor',
    limit: 'limit',
    sort: 'sort',
    filterPrefix: 'f.',
    ...options.params,
  }
  const pageSize = options.pageSize ?? 30
  const toPage = options.toPage ?? ((body) => body as Page<T>)
  const toRecord = options.toRecord ?? ((body) => body as T)
  const routes = options.routes ?? {}

  function url(context: C, route: string) {
    if (route.startsWith('/api/')) return route
    const base =
      typeof options.path === 'function' ? options.path(context) : options.path
    return base + route
  }
  const at = (route: Route | undefined, fallback: Route) => (id: Id) =>
    (route ?? fallback)(encodeURIComponent(id))

  const one = at(routes.one, (id) => `/${id}`)
  const update = at(routes.update, (id) => `/${id}`)
  const remove = at(routes.remove, (id) => `/${id}`)
  const archive = at(routes.archive, (id) => `/${id}/archive`)
  const restore = at(routes.restore, (id) => `/${id}/restore`)

  return {
    list: async (query, context) =>
      toPage(
        await api<unknown>(
          `${url(context, routes.list ?? '')}?${listParams(query, names, pageSize)}`,
        ),
      ),
    one: async (id, context) =>
      toRecord(await api<unknown>(url(context, one(id)))),
    create: async (values, context) =>
      toRecord(
        await api<unknown>(url(context, routes.create ?? ''), {
          body: { json: values },
        }),
      ),
    update: async (id, patch, context) =>
      toRecord(
        await api<unknown>(url(context, update(id)), {
          method: options.updateMethod ?? 'PATCH',
          body: { json: patch },
        }),
      ),
    remove: async (id, context) => {
      await api(url(context, remove(id)), { method: 'DELETE' })
    },
    archive: async (id, context) => {
      await api(url(context, archive(id)), { method: 'POST' })
    },
    restore: async (id, context) => {
      await api(url(context, restore(id)), { method: 'POST' })
    },
  }
}
