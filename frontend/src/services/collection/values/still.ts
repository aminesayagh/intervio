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

/**
 * True when a value has nothing yet (decision 151). Values with their own way to start
 * (a checkbox, files, a picture, a rich text) are never "empty" here.
 */
export function isEmpty<T>(field: FieldDefinition<T>, record: T) {
  switch (field.type) {
    case 'checkbox':
    case 'file':
    case 'avatar':
    case 'richText':
      return false
    default:
      return hasNoValue(field, record)
  }
}

/** Nothing set: no value, an empty text, an empty list (of tags, of files). */
export function hasNoValue<T>(field: FieldDefinition<T>, record: T) {
  const value: unknown = field.value(record)
  return (
    value == null || value === '' || (Array.isArray(value) && !value.length)
  )
}
