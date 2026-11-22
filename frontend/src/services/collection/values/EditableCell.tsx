import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, Icon, Variant } from '../../ui-kit'
import type { TextEdit } from '../definition'

/**
 * A table cell whose text is edited in place (spec 7.3.1). It looks exactly like the
 * other cells; only the text cursor tells it can be edited. Leaving the cell (or
 * Enter) saves; Escape puts the saved text back. A refused or failed text comes back
 * to the saved one; the collection reports why, as a message (decision 132).
 */
export function EditableCell<T>({
  record,
  edit,
  label,
  namespace,
  save,
  look = 'cell',
  placeholder,
  autoFocus,
  onInvalid,
}: {
  record: T
  edit: TextEdit<T>
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  /**
   * cell: in the table, looks like plain text (only the cursor tells). panel and
   * title: in the panel, a light field and a pencil show under the pointer or focus.
   */
  look?: 'cell' | 'panel' | 'title'
  placeholder?: string
  autoFocus?: boolean
  /** A text the definition refuses (its translated reason); without it, it just goes back. */
  onInvalid?: (reason: string) => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const saved = edit.value(record)
  const [text, setText] = useState(saved)
  const [seen, setSeen] = useState(saved)
  const [saving, setSaving] = useState(false)
  const cancelling = useRef(false)

  // The record changed elsewhere (another edit, a reload): show its new text.
  if (saved !== seen) {
    setSeen(saved)
    setText(saved)
  }

  async function commit() {
    if (cancelling.current) {
      cancelling.current = false
      return
    }
    const next = text.trim()
    if (next === saved) {
      setText(saved) // only spaces were added: nothing to save
      return
    }
    const refused = edit.validate?.(next)
    if (refused) {
      setText(saved)
      onInvalid?.(t(refused))
      return
    }
    setSaving(true)
    try {
      await save(edit.patch(next))
    } catch {
      setText(saved) // the message says why
    } finally {
      setSaving(false)
    }
  }

  const input = (
    <input
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      aria-busy={saving || undefined}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          cancelling.current = true
          setText(saved)
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'w-full cursor-text truncate bg-transparent p-0 outline-none',
        look !== 'cell' &&
          '-mx-2 rounded-[var(--field-radius)] px-2 py-1 pe-8 hover:bg-default focus:bg-default',
        look === 'title' && 'text-xl font-medium',
      )}
    />
  )

  return (
    <Variant
      as="span"
      className="block min-w-0"
      value={look === 'cell' ? 'plain' : 'framed'}
      views={{
        plain: () => input,
        // In the panel: a pencil under the pointer or the focus.
        framed: () => (
          <span className="group/edit relative flex items-center">
            {input}
            <span className="pointer-events-none absolute end-0 flex text-muted opacity-0 group-focus-within/edit:opacity-100 group-hover/edit:opacity-100">
              <Icon name="Edit" size={14} />
            </span>
          </span>
        ),
      }}
    />
  )
}
