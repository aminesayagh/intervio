import type { ReactNode } from 'react'
import type { DataSource, Id, ListQuery } from './types'

/** One table column (spec 4). Its label is a translation key in the collection's namespace. */
export type ColumnDefinition<T> = {
  id: string
  label: string
  /** Width in px; the first column (the name) takes the rest of the row. */
  width?: number
  cell: (record: T) => ReactNode
}

/** What a card shows (spec 4): type chip, title, detail line, status, avatar. */
export type CardContent = {
  type?: ReactNode
  title: string
  detail?: ReactNode
  status?: ReactNode
  avatar?: ReactNode
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
  card: (record: T) => CardContent
  columns: ColumnDefinition<T>[]
}
