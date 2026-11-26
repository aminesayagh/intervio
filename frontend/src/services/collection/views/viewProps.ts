import type { RefObject } from 'react'
import type { CollectionDefinition } from '../definition'
import type {
  Id,
  ListQuery,
  More,
  ReportInvalid,
  SaveChange,
  Sort,
} from '../types'
import type { MarksStore } from './rowMarks'

/**
 * What every type of view (the table, the rows, later the kanban) gets from the
 * collection (MOH-21): the records as shown, loading more, opening one, saving a
 * change, and the open row and selection through the marks store. The search,
 * filters, sort menus, selection bar, panel and the empty and error states stay the
 * collection's. A view uses what it needs (the rows have no sort headers and no
 * selection).
 */
export type ViewProps<T, C> = {
  definition: CollectionDefinition<T, C>
  items: T[]
  /** The list's accessible name: the collection's title. */
  label: string
  /** The element that scrolls, for the scroll bookmark and keeping the open record in view. */
  scrollRef: RefObject<HTMLDivElement | null>
  more: More
  /** The sort levels chosen, none for the default order. */
  sort: Sort[]
  onSort: (sort: Sort[]) => void
  save: SaveChange<T>
  report: ReportInvalid<T>
  canEdit: (record: T, id: string) => boolean
  /** Set when a record opens in the panel. */
  onOpen?: (id: Id) => void
  /** Set when records can be selected (spec 8.5): the selected ids. */
  selection?: {
    keys: ReadonlySet<Id>
    onChange: (keys: ReadonlySet<Id>) => void
  }
  /** The open record and the selection, as rows and cells read them. */
  store: MarksStore
  /** What the list asks the data source (a kanban's columns each add their value). */
  query: Omit<ListQuery, 'cursor'>
  context: C
}
