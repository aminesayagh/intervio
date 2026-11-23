import type { ReactNode } from 'react'
import { Checkbox, cn, Variant } from '../../ui-kit'
import { ChoiceCell } from './ChoiceCell'
import type { FieldDefinition, LinkField } from '../definition'
import { EditableCell } from './EditableCell'
import { AvatarCell } from './AvatarCell'
import { CheckboxCell } from './CheckboxCell'
import { DateCell } from './DateCell'
import { DateRangeCell } from './DateRangeCell'
import { FileCell } from './FileCell'
import { IconCell } from './IconCell'
import { LinkCell, LinkValue } from './LinkCell'
import { firstLine } from './markdown'
import { MultiChoiceCell } from './MultiChoiceCell'
import { NumberCell } from './NumberCell'
import { STILL } from './still'
import { StillValue } from './StillValue'
import { useAwake } from './awake'

const isLink = <T,>(field: FieldDefinition<T>): field is LinkField<T> =>
  field.type === 'url' ||
  field.type === 'email' ||
  field.type === 'phone' ||
  field.type === 'location'

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
  const awake = useAwake()
  const link = () =>
    field &&
    isLink(field) && (
      <LinkCell
        record={record}
        edit={field}
        label={label}
        namespace={namespace}
        save={save}
        look={look}
        onInvalid={onInvalid}
      />
    )
  // In the panel, a value the person may change is drawn still until reached
  // (decision 139): its field is built when the pointer or the focus comes to it.
  if (look === 'panel' && !awake && allowed && field && STILL.has(field.type))
    return <StillValue record={record} field={field} read={read} />
  return (
    <Variant
      as="span"
      className={cn('block min-w-0', look === 'cell' && 'truncate')}
      value={
        allowed && field
          ? field.type
          : field?.type === 'checkbox'
            ? 'checkboxRead'
            : field && isLink(field)
              ? 'linkRead'
              : 'read'
      }
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
        multiSelect: () =>
          field?.type === 'multiSelect' && (
            <MultiChoiceCell
              record={record}
              choose={field}
              render={read}
              label={label}
              namespace={namespace}
              save={save}
              look={look}
            />
          ),
        date: () =>
          field?.type === 'date' && (
            <DateCell
              record={record}
              edit={field}
              label={label}
              save={save}
              look={look}
            />
          ),
        // A rich text is edited in the panel; in the table its first line opens the record.
        richText: () =>
          field?.type === 'richText' && (
            <span className="block truncate">
              {firstLine(field.value(record)) || (
                <span className="text-muted">—</span>
              )}
            </span>
          ),
        icon: () =>
          field?.type === 'icon' && (
            <IconCell
              record={record}
              edit={field}
              label={label}
              save={save}
              look={look}
            />
          ),
        avatar: () =>
          field?.type === 'avatar' && (
            <AvatarCell
              record={record}
              edit={field}
              label={label}
              save={save}
              look={look}
              onInvalid={onInvalid}
            />
          ),
        file: () =>
          field?.type === 'file' && (
            <FileCell
              record={record}
              edit={field}
              label={label}
              save={save}
              look={look}
              onInvalid={onInvalid}
            />
          ),
        dateRange: () =>
          field?.type === 'dateRange' && (
            <DateRangeCell
              record={record}
              edit={field}
              label={label}
              save={save}
              look={look}
            />
          ),
        checkbox: () =>
          field?.type === 'checkbox' && (
            <CheckboxCell
              record={record}
              edit={field}
              label={label}
              save={save}
            />
          ),
        // Without the right, a yes-or-no value is still a checkbox, read only.
        checkboxRead: () =>
          field?.type === 'checkbox' && (
            <Checkbox
              aria-label={label}
              isReadOnly
              isSelected={field.value(record)}
            />
          ),
        url: () => link(),
        email: () => link(),
        phone: () => link(),
        location: () => link(),
        // Without the right, a link is still a link.
        linkRead: () =>
          field &&
          isLink(field) && (
            <LinkValue kind={field.type} value={field.value(record)} />
          ),
        read: () => read(record),
      }}
    />
  )
}
