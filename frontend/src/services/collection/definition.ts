import type { ReactNode } from 'react'
import type { DataSource, Id, ListQuery, SortDirection } from './types'

/** One table column (spec 4). Its label is a translation key in the collection's namespace. */
export type ColumnDefinition<T> = {
  id: string
  label: string
  /** Width in px; the first column (the name) takes the rest of the row. */
  width?: number
  cell: (record: T) => ReactNode
  /**
   * Set when the column can be sorted (by the server, sort id = column id): the
   * direction it takes when first chosen (a date usually starts newest first).
   */
  sort?: SortDirection
}

/** A filter menu (spec 4): its options are fixed, and several can be chosen. */
export type FilterDefinition = {
  id: string
  /** Translation key of the menu's name. */
  label: string
  /** Each option's id goes to the address and the data source; its label is a translation key. */
  options: { id: string; label: string }[]
}

/**
 * Everything specific to one kind of record (spec 4). The wrapper knows nothing else
 * about it. Later steps add the panel, rights, filters and creation.
 */
export type CollectionDefinition<T, C = void> = {
  /** Names the cache, the storage keys and the addresses ("resources"). */
  key: string
  /** Translation keys in `namespace`. `count` is plural: "{{count}} records". */
  i18n: {
    namespace: string
    title: string
    count: string
    empty: { title: string; text: string }
  }
  getId: (record: T) => Id
  source: DataSource<T, C>
  defaultSort: ListQuery['sort']
  columns: ColumnDefinition<T>[]
  filters?: FilterDefinition[]
}
