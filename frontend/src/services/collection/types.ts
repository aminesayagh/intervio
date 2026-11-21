/** A record's public identifier: its UUID v7. */
export type Id = string

/** One page of a list (spec section 11). `total` is optional: without it, the header shows "30+". */
export type Page<T> = { items: T[]; nextCursor: string | null; total?: number }

export type SortDirection = 'asc' | 'desc'

/** What a list asks for: the address's search, filters and sort, and where to continue. */
export type ListQuery = {
  search: string
  filters: Record<string, string[]> // filter id → chosen option ids
  sort: { by: string; direction: SortDirection }
  cursor: string | null
}

/**
 * How a collection reaches its data (spec section 11). The wrapper calls these and
 * nothing else; `restSource` builds them from REST conventions, and any one can be replaced.
 */
export type DataSource<T, C = void> = {
  list: (query: ListQuery, context: C) => Promise<Page<T>>
  one: (id: Id, context: C) => Promise<T>
  create?: (values: Partial<T>, context: C) => Promise<T>
  update?: (id: Id, patch: Partial<T>, context: C) => Promise<T>
  remove?: (id: Id, context: C) => Promise<void>
  archive?: (id: Id, context: C) => Promise<void>
  restore?: (id: Id, context: C) => Promise<void>
}
