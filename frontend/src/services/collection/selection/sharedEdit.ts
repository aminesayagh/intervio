import { createContext, useContext } from 'react'
import type { ColumnDefinition } from '../definition'

/**
 * The field types several records can share (decision 135): a value changed on a
 * selected row is saved on every selected row. A name, a text, a file or a link
 * belongs to one record, so it stays on the one edited.
 */
const SHARED_TYPES = new Set([
  'select',
  'multiSelect',
  'checkbox',
  'number',
  'date',
  'dateRange',
])

/** Whether a column's value is changed on the whole selection. */
export function isShared<T>(column: ColumnDefinition<T>) {
  return Boolean(
    column.field &&
    SHARED_TYPES.has(column.field.type) &&
    column.bulk !== false,
  )
}

/**
 * Set around a value of a selected row when its change applies to the selection:
 * the note its editor shows ("Applies to 3 items").
 */
export const SharedNote = createContext<string | null>(null)
export const useSharedNote = () => useContext(SharedNote)
