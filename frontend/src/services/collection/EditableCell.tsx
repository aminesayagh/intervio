import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TextEdit } from './definition'

/**
 * A table cell whose text is edited in place (spec 7.3.1). It looks exactly like the
 * other cells; only the text cursor tells it can be edited. Leaving the cell (or
 * Enter) saves; Escape puts the saved text back. A refused text comes back to the
 * saved one, with a short message under it.
 */
export function EditableCell<T>({
  record,
  edit,
  label,
  namespace,
  save,
}: {
  record: T
  edit: TextEdit<T>
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const saved = edit.value(record)
  const [text, setText] = useState(saved)
  const [seen, setSeen] = useState(saved)
  const [error, setError] = useState<string | null>(null)
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
      setError(t(refused))
      setText(saved)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await save(edit.patch(next))
    } catch {
      setError(t('collection:error.save'))
      setText(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-busy={saving || undefined}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setError(null)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            cancelling.current = true
            setText(saved)
            setError(null)
            event.currentTarget.blur()
          }
        }}
        className="w-full cursor-text truncate bg-transparent p-0 outline-none"
      />
      {error && (
        <p role="alert" className="truncate text-xs text-danger">
          {error}
        </p>
      )}
    </>
  )
}
