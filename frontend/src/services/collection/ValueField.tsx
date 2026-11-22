import type { ReactNode } from 'react'
import { cn, Variant } from '../ui-kit'
import { ChoiceCell } from './ChoiceCell'
import type { ChoiceEdit, TextEdit } from './definition'
import { EditableCell } from './EditableCell'

/** How a value shows (spec 7.7): a text field, a menu, or plain text without the right. */
type Editor = 'edit' | 'choose' | 'read'

const editorOf = (
  target: { edit?: unknown; choose?: unknown },
  allowed: boolean,
): Editor =>
  !allowed ? 'read' : target.edit ? 'edit' : target.choose ? 'choose' : 'read'

/**
 * One value of a record, wherever it shows (table cell, panel, new record): its text
 * field, its menu, or its plain display, chosen by its definition and the person's
 * right. A change of view (the right is lost, say) fades like every other (Variant).
 */
export function ValueField<T>({
  record,
  target,
  allowed,
  read,
  label,
  namespace,
  save,
  look,
}: {
  record: T
  target: { edit?: TextEdit<T>; choose?: ChoiceEdit<T> }
  /** The person may change this value. */
  allowed: boolean
  /** The value as plain display (also the menu's button content). */
  read: (record: T) => ReactNode
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  look: 'cell' | 'panel'
}) {
  return (
    <Variant
      as="span"
      className={cn('block min-w-0', look === 'cell' && 'truncate')}
      value={editorOf(target, allowed)}
      views={{
        edit: () => (
          <EditableCell
            record={record}
            edit={target.edit!}
            label={label}
            namespace={namespace}
            save={save}
            look={look}
          />
        ),
        choose: () => (
          <ChoiceCell
            record={record}
            choose={target.choose!}
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
