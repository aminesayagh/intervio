import type { ReactNode } from 'react'
import { cn, Variant } from '../../ui-kit'
import { ChoiceCell } from './ChoiceCell'
import type { FieldDefinition } from '../definition'
import { EditableCell } from './EditableCell'
import { NumberCell } from './NumberCell'

/**
 * One value of a record, wherever it shows (table cell, panel, new record): its text
 * field, its menu, or its plain display, chosen by its definition and the person's
 * right. A change of view (the right is lost, say) fades like every other (Variant).
 */
export function ValueField<T>({
  record,
  field,
  allowed,
  read,
  label,
  namespace,
  save,
  look,
  onInvalid,
}: {
  record: T
  /** How it is edited; without it (or without the right), it is read only. */
  field?: FieldDefinition<T>
  /** The person may change this value. */
  allowed: boolean
  /** The value as plain display (also the menu's button content). */
  read: (record: T) => ReactNode
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  look: 'cell' | 'panel'
  /** A text the definition refuses: the collection reports it (decision 132). */
  onInvalid?: (reason: string) => void
}) {
  return (
    <Variant
      as="span"
      className={cn('block min-w-0', look === 'cell' && 'truncate')}
      value={allowed && field ? field.type : 'read'}
      views={{
        text: () =>
          field?.type === 'text' && (
            <EditableCell
              record={record}
              edit={field}
              label={label}
              namespace={namespace}
              save={save}
              look={look}
              onInvalid={onInvalid}
            />
          ),
        number: () =>
          field?.type === 'number' && (
            <NumberCell
              record={record}
              edit={field}
              label={label}
              save={save}
              look={look}
            />
          ),
        select: () =>
          field?.type === 'select' && (
            <ChoiceCell
              record={record}
              choose={field}
              render={read}
              label={label}
              namespace={namespace}
              save={save}
              look={look}
            />
          ),
        read: () => read(record),
      }}
    />
  )
}
