import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChoiceMenu,
  FieldButton,
  MenuPopover,
  MenuTrigger,
  Show,
} from '../../ui-kit'
import { useSharedNote } from '../selection/sharedEdit'
import type { SelectField } from '../definition'

/**
 * A table cell whose value is chosen from a list (a status): it shows the column's
 * own display (the chip) unchanged, with a pointer cursor; a click opens the
 * choices, and a choice saves at once. A refused choice comes back to the saved
 * one; the collection reports why, as a message (decision 132).
 */
export function ChoiceCell<T>({
  record,
  choose,
  render,
  label,
  namespace,
  save,
  look = 'cell',
}: {
  record: T
  choose: SelectField<T>
  /** The column's display, for a record (with the chosen value while it saves). */
  render: (record: T) => ReactNode
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  /** In the panel, a light background shows under the pointer or focus. */
  look?: 'cell' | 'panel'
}) {
  const note = useSharedNote()
  const { t } = useTranslation([namespace, 'collection'])
  const saved = choose.value(record)
  const [pending, setPending] = useState<string | null>(null)
  const shown = pending ?? saved

  async function pick(id: string) {
    if (id === saved) return
    setPending(id)
    try {
      await save(choose.patch(id))
    } catch {
      // the saved value comes back; the message says why
    } finally {
      setPending(null)
    }
  }

  return (
    <MenuTrigger>
      <FieldButton
        look={look}
        aria-label={`${label}: ${t(choose.options.find((o) => o.id === shown)?.label ?? shown)}`}
        aria-busy={pending ? true : undefined}
      >
        {render(
          shown === saved ? record : { ...record, ...choose.patch(shown) },
        )}
      </FieldButton>
      <MenuPopover minWidth={180}>
        <Show when={note} className="px-3 pt-2 pb-1 text-xs text-muted">
          {note}
        </Show>
        <ChoiceMenu
          label={label}
          mode="single"
          options={choose.options.map((option) => ({
            id: option.id,
            label: t(option.label),
          }))}
          selected={[shown]}
          // Choosing the current value again would empty the choice: ignored.
          onChange={(ids) => ids[0] && pick(ids[0])}
        />
      </MenuPopover>
    </MenuTrigger>
  )
}
