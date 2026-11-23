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
