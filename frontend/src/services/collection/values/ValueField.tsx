import { Plus } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
import { STILL, STILL_IN_TABLE } from './still'
import { StillValue } from './StillValue'
import { useAwake } from './awake'

const isLink = <T,>(field: FieldDefinition<T>): field is LinkField<T> =>
  field.type === 'url' ||
  field.type === 'email' ||
  field.type === 'phone' ||
  field.type === 'location'

/**
 * True when a value has nothing yet (decision 151). Values with their own way to start
 * (a checkbox, files, a picture, a rich text) are never "empty" here.
 */
function isEmpty<T>(field: FieldDefinition<T>, record: T) {
  switch (field.type) {
    case 'checkbox':
    case 'file':
    case 'avatar':
    case 'richText':
      return false
    default: {
      const value: unknown = field.value(record)
      return (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      )
    }
  }
}

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
  const { t } = useTranslation('collection')
  const awake = useAwake()
  // In the panel, an empty value the person may set is "Add Quantity" (decision 151):
  // pressed, its own control shows and opens (a menu) or takes the focus (a field).
  const [adding, setAdding] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const empty = look === 'panel' && allowed && field && isEmpty(field, record)
  useEffect(() => {
    if (!adding) return
    const control = box.current?.querySelector<HTMLElement>(
      'input, [role=spinbutton], button, [data-asleep]',
    )
    if (control instanceof HTMLButtonElement) control.click()
    else control?.focus()
  }, [adding])
  if (empty && !adding)
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="inline-flex h-6 items-center gap-1 rounded-[var(--field-radius)] border border-border px-2 text-xs text-muted outline-none hover:text-foreground focus-visible:border-foreground"
      >
        <Plus size={12} />
        {t('empty.add', { name: label })}
      </button>
    )
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
  // A value the person may change is drawn still until reached (decision 139): its
  // control is built when the pointer or the focus comes to it (in the table, to its row).
  if (
    !awake &&
    !adding &&
    allowed &&
    field &&
    (look === 'panel' ? STILL : STILL_IN_TABLE).has(field.type)
  )
    return (
      <StillValue
        record={record}
        field={field}
        read={read}
        label={label}
        namespace={namespace}
        look={look}
      />
    )
  const view = (
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
            // In the panel, as tall as the other values' controls.
            <span
              className={cn('flex', look === 'panel' && 'h-7 items-center')}
            >
              <CheckboxCell
                record={record}
                edit={field}
                label={label}
                save={save}
              />
            </span>
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
  if (look !== 'panel') return view
  return (
    <span
      ref={box}
      className="contents"
      // Left with nothing set (not for its own menu or calendar): back to "Add …".
      onBlur={(event) => {
        const next = event.relatedTarget as Element | null
        if (
          empty &&
          !box.current?.contains(next) &&
          !next?.closest('[data-trigger]')
        )
          setAdding(false)
      }}
    >
      {view}
    </span>
  )
}
