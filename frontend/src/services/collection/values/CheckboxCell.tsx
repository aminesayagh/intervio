import { useState } from 'react'
import { Checkbox } from '../../ui-kit'
import type { CheckboxField } from '../definition'

/**
 * A yes-or-no value (spec 7.3.0): a click saves at once and shows the new state
 * right away; a refused change goes back, and the collection reports why
 * (decision 132).
 */
export function CheckboxCell<T>({
  record,
  edit,
  label,
  save,
}: {
  record: T
  edit: CheckboxField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
}) {
  const saved = edit.value(record)
  const [pending, setPending] = useState<boolean | null>(null)

  async function toggle(next: boolean) {
    setPending(next)
    try {
      await save(edit.patch(next))
    } catch {
      // the saved state comes back; the message says why
    } finally {
      setPending(null)
    }
  }

  return (
    <Checkbox
      aria-label={label}
      isSelected={pending ?? saved}
      onChange={(next) => void toggle(next)}
    />
  )
}
