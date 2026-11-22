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
  /** Set when the column's text can be edited in its cell (spec 7.3.1). */
  edit?: TextEdit<T>
  /** Set when the column's value is chosen from a list in its cell (a status). */
  choose?: ChoiceEdit<T>
}

/** How a column's value is chosen in place: the choices, the current one, the change. */
export type ChoiceEdit<T> = {
  /** Each choice's id, and its label as a translation key. */
  options: { id: string; label: string }[]
  value: (record: T) => string
  patch: (id: string) => Partial<T>
}

/** How a column's text is edited in place: read it, check it, turn it into a change. */
export type TextEdit<T> = {
  value: (record: T) => string
  /** A translation key (in the collection's namespace) when the text is refused. */
  validate?: (text: string) => string | undefined
  patch: (text: string) => Partial<T>
}

/** One row of the panel's properties: a label, and the record's value (spec 7). */
export type PropertyDefinition<T> = {
  id: string
  /** Translation key of the label. */
  label: string
  value: (record: T) => ReactNode
  /** Set when the value's text can be edited in place (when the rights allow it). */
  edit?: TextEdit<T>
  /** Set when the value is chosen from a list in place (when the rights allow it). */
  choose?: ChoiceEdit<T>
}

/** A section of linked records in the panel; it shows its first five (spec 7, 12.1). */
export type SectionDefinition<T> = {
  id: string
  /** Translation key of the title. */
  label: string
  items: (record: T) => { id: string; label: string; kind?: ReactNode }[]
}

/** What the record panel shows (spec 7). */
export type PanelDefinition<T> = {
  /** The chip in the top bar: the record's kind. */
  type: (record: T) => ReactNode
  title: (record: T) => string
  /** Set when the title can be edited in place (right id: "title"). */
  titleEdit?: TextEdit<T>
  /** The line under the title, such as who added the record and when. */
  subtitle?: (record: T) => ReactNode
  properties: PropertyDefinition<T>[]
  /** The record's Markdown description, under the properties (right id: "description"). */
  description?: {
    value: (record: T) => string
    patch: (text: string) => Partial<T>
  }
  sections?: SectionDefinition<T>[]
}

/**
 * What one person may change on one record (spec 7.7): the ids of the columns and
 * properties (and "title") they may edit. A value not listed shows as plain text.
 */
export type Rights = {
  edit: string[]
  /** The ids of the actions the person may run (archive, remove). */
  actions?: string[]
}

/**
 * An action in the panel's More actions menu (spec 7.4), run through the data source
 * after a confirmation. The texts are translation keys in the collection's namespace.
 */
export type ActionDefinition = {
  id: 'archive' | 'remove'
  label: string
  confirm: { title: string; text: string; button: string }
}

/** A filter menu (spec 4): its options are fixed, and several can be chosen. */
export type FilterDefinition = {
  id: string
  /** Translation key of the menu's name. */
  label: string
  /** Each option's id goes to the address and the data source; its label is a translation key. */
  options: { id: string; label: string }[]
  /**
   * How one chosen value becomes part of a new record (spec 7.5): a list filtered on
   * one value creates records with that value, so they belong to the list.
   */
  patch?: (value: string) => Partial<unknown>
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
  /** Which columns stay when the list narrows, most important first (spec 9). Defaults to the columns' order. */
  columnPriority?: string[]
  filters?: FilterDefinition[]
  /** Set when a record opens in the panel beside the list. */
  panel?: PanelDefinition<T>
  /**
   * What the person may change on a record. Without it, every editable value can be
   * changed. The server checks every change again.
   */
  rights?: (record: T, context: C) => Rights
  /** The actions of the More actions menu, after Open full page and Copy link. */
  actions?: ActionDefinition[]
  /**
   * Set when records can be created (spec 7.5): "+ Add" opens a new record in the
   * panel with these defaults, created as soon as it is ready.
   */
  create?: {
    /** "+ Add …" and "New …": translation keys in the collection's namespace. */
    add: string
    defaults: (context: C) => Partial<T>
    /** True when the new record has what it needs to be created (its name, often). */
    ready: (draft: Partial<T>) => boolean
  }
}
