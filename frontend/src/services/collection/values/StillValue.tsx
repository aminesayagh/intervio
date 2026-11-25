import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { Check, ImageUp, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { addLook, chip, cn } from '../../ui-kit'
import type { FieldDefinition } from '../definition'
import { AvatarImage } from './AvatarCell'
import { FileList } from './FileCell'
import { OpenLink } from './LinkCell'
import type { ReactNode } from 'react'

/** The text field's panel look, at rest. */
const field = cn(chip, 'cursor-text outline-none')
/** The menu button's panel look (FieldButton), at rest. */
const menu = cn(
  chip,
  'flex max-w-full cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-foreground',
)
/** A small ghost button (Button look="ghost" size="sm"), at rest. */
const ghost =
  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--field-radius)] px-3 font-medium outline-none hover:bg-default focus-visible:outline-2 focus-visible:outline-foreground'

/**
 * A value of the panel, drawn still until the person reaches it (decision 139): the
 * same look as its field, menu, checkbox or buttons at rest, in plain elements (plain
 * buttons where the real one is a button, so they size and align the same). The
 * parts that take the keyboard carry `data-asleep`: Tab reaches them, the value wakes,
 * and the focus moves on to the real control (`useHandFocus`).
 */
export function StillValue<T>({
  record,
  field: definition,
  read,
  label,
  namespace,
  look,
}: {
  record: T
  field: FieldDefinition<T>
  read: (record: T) => ReactNode
  /** The value's name: still buttons and boxes are named as their control is. */
  label: string
  /** The collection's namespace, for the names of its options. */
  namespace: string
  look: 'cell' | 'panel'
}) {
  const { t } = useTranslation('collection')
  if (look === 'cell')
    return (
      <StillCell
        record={record}
        field={definition}
        read={read}
        label={label}
        namespace={namespace}
      />
    )
  const none = <span className="text-muted">—</span>
  switch (definition.type) {
    case 'text':
      return (
        <span
          data-asleep
          tabIndex={0}
          className={cn('block w-fit max-w-full truncate', field)}
        >
          {definition.value(record) || ' '}
        </span>
      )
    case 'url':
    case 'email':
    case 'phone':
    case 'location': {
      const value = definition.value(record)
      return (
        <span className="flex min-w-0 items-center gap-1">
          <span
            data-asleep
            tabIndex={0}
            className={cn(field, 'block min-w-16 truncate pe-4')}
          >
            {value || ' '}
          </span>
          <OpenLink kind={definition.type} value={value} look="panel" />
        </span>
      )
    }
    case 'select':
    case 'multiSelect':
      return (
        <button type="button" data-asleep className={menu}>
          {read(record)}
        </button>
      )
    case 'icon': {
      const name = definition.value(record)
      const shown = name ? (
        <DynamicIcon name={name as IconName} size={16} />
      ) : (
        none
      )
      return (
        <button type="button" data-asleep className={menu}>
          <span className="flex">{shown}</span>
        </button>
      )
    }
    case 'checkbox': {
      const on = definition.value(record)
      const check = on ? <Check size={12} /> : null
      return (
        <span
          data-asleep
          tabIndex={0}
          className={cn(
            'inline-flex cursor-pointer items-center rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
            look === 'panel' && 'h-7',
          )}
        >
          <span
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-[var(--color-text-secondary)] text-background',
              on && 'border-foreground bg-foreground',
            )}
          >
            {check}
          </span>
        </span>
      )
    }
    case 'avatar': {
      const file = definition.value(record)
      const remove = file ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('fields.remove')}
          className={cn(ghost, 'px-2')}
        >
          <Trash2 size={14} />
        </button>
      ) : null
      return (
        <span className="flex items-center gap-2">
          <AvatarImage edit={definition} file={file} look="panel" />
          <span className="flex">
            <button
              type="button"
              data-asleep
              aria-label={t(file ? 'fields.replace' : 'fields.uploadShort')}
              className={cn(ghost, 'px-2')}
            >
              <ImageUp size={14} />
            </button>
            {remove}
          </span>
        </span>
      )
    }
    case 'file':
      return (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <FileList files={definition.value(record)} src={definition.src} />
          <button type="button" data-asleep className={addLook}>
            <Plus size={12} />
            {t('empty.add', { name: label })}
          </button>
        </div>
      )
    default:
      return null
  }
}

/**
 * A value of the table, drawn still until its row is reached (decision 139): the
 * cell's look of its field, menu button or checkbox, named as the control is. Their
 * row wakes them under the pointer or the focus; they don't take the focus
 * themselves (the grid's arrow keys move between cells).
 */
function StillCell<T>({
  record,
  field: definition,
  read,
  label,
  namespace,
}: {
  record: T
  field: FieldDefinition<T>
  read: (record: T) => ReactNode
  label: string
  namespace: string
}) {
  const { t } = useTranslation([namespace, 'collection'])
  switch (definition.type) {
    case 'text':
      return (
        <input
          readOnly
          data-asleep
          tabIndex={-1}
          aria-label={label}
          value={definition.value(record)}
          className="w-full min-w-0 cursor-text truncate bg-transparent p-0 outline-none"
        />
      )
    case 'url':
    case 'email':
    case 'phone':
    case 'location': {
      const value = definition.value(record)
      return (
        <span className="group/link flex min-w-0 items-center gap-1">
          <span data-asleep tabIndex={-1} className="min-w-16 truncate pe-4">
            {value}
          </span>
          <OpenLink kind={definition.type} value={value} look="cell" />
        </span>
      )
    }
    case 'select': {
      const chosen = definition.options.find(
        (option) => option.id === definition.value(record),
      )
      return (
        <button
          type="button"
          data-asleep
          tabIndex={-1}
          aria-label={`${label}: ${chosen ? t(chosen.label) : definition.value(record)}`}
          className={cell}
        >
          {read(record)}
        </button>
      )
    }
    case 'multiSelect': {
      const chosen = definition.value(record)
      const names = definition.options
        .filter((option) => chosen.includes(option.id))
        .map((option) => t(option.label))
      return (
        <button
          type="button"
          data-asleep
          tabIndex={-1}
          aria-label={`${label}: ${names.join(', ') || t('collection:fields.none')}`}
          className={cell}
        >
          {read(record)}
        </button>
      )
    }
    case 'checkbox': {
      const on = definition.value(record)
      const check = on ? <Check size={12} /> : null
      return (
        <span
          role="checkbox"
          aria-checked={on}
          aria-label={label}
          data-asleep
          tabIndex={-1}
          className="inline-flex cursor-pointer items-center outline-none"
        >
          <span className={cn(box, on && 'border-foreground bg-foreground')}>
            {check}
          </span>
        </span>
      )
    }
    default:
      return null
  }
}

/** The menu button's cell look (FieldButton), at rest. */
const cell =
  'flex max-w-full cursor-pointer rounded-[var(--field-radius)] outline-none'
/** The checkbox's box (Checkbox), at rest. */
const box =
  'flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-[var(--color-text-secondary)] text-background'
