import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInput } from '../../ui-kit'
import type { TextField } from '../definition'

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
  inputType = 'text',
  fit = false,
}: {
  record: T
  edit: TextField<T>
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  /**
   * cell: in the table, looks like plain text (only the cursor tells). panel and
   * title: in the panel, a light field shows under the pointer or focus.
   */
  look?: 'cell' | 'panel' | 'title'
  placeholder?: string
  autoFocus?: boolean
  /** A text the definition refuses (its translated reason); without it, it just goes back. */
  onInvalid?: (reason: string) => void
  /** The keyboard and the browser's checks: a web address, an email, a phone number. */
  inputType?: 'text' | 'url' | 'email' | 'tel'
  /** As wide as its text, so an icon after it comes right after. */
  fit?: boolean
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

  return (
    <TextInput
      aria-label={label}
      type={inputType}
      fit={fit}
      look={look}
      placeholder={placeholder}
      autoFocus={autoFocus}
      busy={saving}
      value={text}
      onChange={setText}
      onBlur={commit}
      onKeyDown={(event) => {
        const input = event.target as HTMLInputElement
        if (event.key === 'Enter') input.blur()
        if (event.key === 'Escape') {
          cancelling.current = true
          setText(saved)
          input.blur()
        }
      }}
    />
  )
}
