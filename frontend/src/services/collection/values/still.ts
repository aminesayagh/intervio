import type { FieldDefinition } from '../definition'

/** The field types drawn still in the panel until reached (dates and numbers do it themselves). */
export const STILL = new Set<FieldDefinition<unknown>['type']>([
  'text',
  'url',
  'email',
  'phone',
  'location',
  'select',
  'multiSelect',
  'icon',
  'checkbox',
  'avatar',
  'file',
])

/**
 * In the table, the ones drawn still until their row is reached: those in view in
 * every row. Icon and picture columns are rare and cheap; a files cell shows a count.
 */
export const STILL_IN_TABLE = new Set<FieldDefinition<unknown>['type']>([
  'text',
  'url',
  'email',
  'phone',
  'location',
  'select',
  'multiSelect',
  'checkbox',
])
