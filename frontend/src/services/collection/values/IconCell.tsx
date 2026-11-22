import { useState } from 'react'
import { IconPicker } from '../../ui-kit'
import type { IconField } from '../definition'
import { ICON_CHOICES } from './iconChoices'

/**
 * An icon chosen in place (spec 7.3.0): a choice saves at once and shows right
 * away; a refused one goes back, and the collection reports why (decision 132).
 */
export function IconCell<T>({
  record,
  edit,
  label,
  save,
  look = 'cell',
}: {
  record: T
  edit: IconField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
}) {
  const saved = edit.value(record)
  const [pending, setPending] = useState<string | null | undefined>(undefined)

  async function choose(name: string | null) {
    if (name === saved) return
    setPending(name)
    try {
      await save(edit.patch(name))
    } catch {
      // the saved icon comes back; the message says why
    } finally {
      setPending(undefined)
    }
  }

  return (
    <IconPicker
      label={label}
      look={look}
      value={pending === undefined ? saved : pending}
      options={edit.options ?? ICON_CHOICES}
      onChange={(name) => void choose(name)}
    />
  )
}
