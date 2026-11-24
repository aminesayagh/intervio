/** A record's public identifier: its UUID v7. */
export type Id = string

/** One page of a list (spec section 11). `total` is optional: without it, the header shows "30+". */
export type Page<T> = {
  items: T[]
  nextCursor: string | null
  /** The cursor of the page before this one: null at the start of the list. */
  previousCursor?: string | null
  total?: number
}

export type SortDirection = 'asc' | 'desc'

/** What a list asks for: the address's search, filters and sort, and where to continue. */
export type ListQuery = {
  search: string
  filters: Record<string, string[]> // filter id → chosen option ids
  sort: { by: string; direction: SortDirection }
  cursor: string | null
  /** The page after the cursor (the default), or the one before it (scrolling up). */
  direction?: 'after' | 'before'
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
  /** One change on several records, in one request (spec 8.5). Without it, each is saved on its own. */
  updateMany?: (
    ids: Id[],
    patch: Partial<T>,
    context: C,
  ) => Promise<ManyUpdated<T>>
  remove?: (id: Id, context: C) => Promise<void>
  archive?: (id: Id, context: C) => Promise<void>
  restore?: (id: Id, context: C) => Promise<void>
}

/** The answer to a change on several records: those changed, and those refused with their code. */
export type ManyUpdated<T> = {
  updated: T[]
  failed: { id: Id; code: string }[]
}

/** Saves a change to one value; `field` names it for the messages (decision 132). */
export type SaveChange<T> = (
  record: T,
  patch: Partial<T>,
  field?: { label: string; quiet?: boolean },
) => Promise<void>

/** Reports a value the definition refused (its field's label, the reason). */
export type ReportInvalid<T> = (
  record: T,
  field: string,
  reason: string,
) => void
