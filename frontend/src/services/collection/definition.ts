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
  /** How the value is edited in its cell (spec 7.3.0); without it, it is read only. */
  field?: FieldDefinition<T>
}

/** A text edited in place: read it, check it, turn it into a change. */
export type TextField<T> = {
  type: 'text'
  value: (record: T) => string
  /** A translation key (in the collection's namespace) when the text is refused. */
  validate?: (text: string) => string | undefined
  patch: (text: string) => Partial<T>
}

/** A number edited in place, with steppers: its decimals and limits. */
export type NumberField<T> = {
  type: 'number'
  /** null: no value (the field is empty). */
  value: (record: T) => number | null
  patch: (value: number | null) => Partial<T>
  /** Digits after the decimal point, for a float (default 0: a whole number). */
  decimals?: number
  min?: number
  max?: number
  /** What one step of the chevrons (or an arrow key) adds; default 1, or 0.1 with 1 decimal. */
  step?: number
}

/** One value chosen from a list (a status): the choices, the current one, the change. */
export type SelectField<T> = {
  type: 'select'
  /** Each choice's id, and its label as a translation key. */
  options: { id: string; label: string }[]
  value: (record: T) => string
  patch: (id: string) => Partial<T>
}

/** Several values chosen from a list (tags): saved when the menu closes. */
export type MultiSelectField<T> = {
  type: 'multiSelect'
  /** Each choice's id, and its label as a translation key. */
  options: { id: string; label: string }[]
  value: (record: T) => string[]
  patch: (ids: string[]) => Partial<T>
}

/** A date, or a date and a time: typed in segments or picked in a calendar. */
export type DateField<T> = {
  type: 'date'
  /** '2026-12-01', or with `time` '2026-12-01T09:30'; null when there is none. */
  value: (record: T) => string | null
  patch: (value: string | null) => Partial<T>
  /** Hours and minutes too. */
  time?: boolean
  /** The earliest and the latest date, in the same form. */
  min?: string
  max?: string
}

/** A Markdown text: edited in the panel (like the description), its first line in the table. */
export type RichTextField<T> = {
  type: 'richText'
  value: (record: T) => string
  patch: (markdown: string) => Partial<T>
}

/** An icon chosen from a grid of Lucide icons. */
export type IconField<T> = {
  type: 'icon'
  /** A Lucide name ("wrench"), or null. */
  value: (record: T) => string | null
  patch: (name: string | null) => Partial<T>
  /** The icons offered; the archetype's maintenance set by default. */
  options?: string[]
}

/** A file once uploaded: what the record keeps of it. */
export type StoredFile = {
  id: string
  name: string
  contentType: string
  sizeBytes: number
}

/**
 * A picture uploaded for the record (decision 133). Where files go is the
 * collection's choice: its `upload` (the files service, or memory in tests).
 */
export type AvatarField<T> = {
  type: 'avatar'
  value: (record: T) => StoredFile | null
  patch: (file: StoredFile | null) => Partial<T>
  upload: (file: File) => Promise<StoredFile>
  /** The address that shows the picture. */
  src: (file: StoredFile) => string
  /** Accepted types (default png, jpg, jpeg) and size (default 2 MB). */
  extensions?: string[]
  maxMb?: number
  shape?: 'round' | 'square'
}

/**
 * Files attached to the record (decision 133): listed in the panel, counted in the
 * table. Where files go is the collection's choice, through its `upload`.
 */
export type FileField<T> = {
  type: 'file'
  value: (record: T) => StoredFile[]
  patch: (files: StoredFile[]) => Partial<T>
  upload: (file: File) => Promise<StoredFile>
  /** The address that opens a file. */
  src: (file: StoredFile) => string
  /** Accepted types (default: documents, as the files service) and size (default 10 MB). */
  extensions?: string[]
  maxMb?: number
}

/** A yes-or-no value, saved on each click. */
export type CheckboxField<T> = {
  type: 'checkbox'
  value: (record: T) => boolean
  patch: (value: boolean) => Partial<T>
}

/**
 * A web address, an email address, a phone number or a location (an address,
 * opened in a map): checked when it can be, and shown as a link.
 */
export type LinkField<T> = {
  type: 'url' | 'email' | 'phone' | 'location'
  /** '' when there is none. */
  value: (record: T) => string
  patch: (value: string) => Partial<T>
}

/** How a value shows and is edited, by its type (spec 7.3.0, decision 133). */
export type FieldDefinition<T> =
  | TextField<T>
  | RichTextField<T>
  | NumberField<T>
  | SelectField<T>
  | MultiSelectField<T>
  | DateField<T>
  | CheckboxField<T>
  | IconField<T>
  | AvatarField<T>
  | FileField<T>
  | LinkField<T>

/** One row of the panel's properties: a label, and the record's value (spec 7). */
export type PropertyDefinition<T> = {
  id: string
  /** Translation key of the label. */
  label: string
  value: (record: T) => ReactNode
  /** How the value is edited in place, when the rights allow it (spec 7.3.0). */
  field?: FieldDefinition<T>
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
  titleEdit?: TextField<T>
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
