import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChoiceMenu,
  FieldButton,
  MenuPopover,
  MenuTrigger,
  Show,
} from '../../ui-kit'
import { useSharedNote } from '../selection/sharedEdit'
import type { MultiSelectField } from '../definition'

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id))

/**
 * Several values chosen from a list (spec 7.3.0): a click opens the choices with
 * check marks; several can be checked while the menu is open, and the change is
 * saved once, when it closes. The chips follow at once; a refused change goes
 * back, and the collection reports why (decision 132).
 */
export function MultiChoiceCell<T>({
  record,
  choose,
  render,
  label,
  namespace,
  save,
  look = 'cell',
}: {
  record: T
  choose: MultiSelectField<T>
  /** The read view, for a record (with the chosen values while the menu is open). */
  render: (record: T) => ReactNode
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
}) {
  const note = useSharedNote()
  const { t } = useTranslation([namespace, 'collection'])
  const saved = choose.value(record)
  // While the menu is open, and until the save ends: the chosen values.
  const [draft, setDraft] = useState<string[] | null>(null)
  const latest = useRef<string[] | null>(null)
  const shown = draft ?? saved

  // Kept in the options' order, whatever the order of the clicks.
  function change(ids: string[]) {
    const ordered = choose.options
      .map((option) => option.id)
      .filter((id) => ids.includes(id))
    latest.current = ordered
    setDraft(ordered)
  }
  async function close() {
    const next = latest.current
    latest.current = null
    if (!next || same(next, saved)) return setDraft(null)
    try {
      await save(choose.patch(next))
    } catch {
      // the saved values come back; the message says why
    } finally {
      setDraft(null)
    }
  }

  const names = choose.options
    .filter((option) => shown.includes(option.id))
    .map((option) => t(option.label))
  return (
    <MenuTrigger onOpenChange={(open) => (open ? change(saved) : void close())}>
      <FieldButton
        look={look}
        aria-label={`${label}: ${names.join(', ') || t('collection:fields.none')}`}
      >
        {render({ ...record, ...choose.patch(shown) })}
      </FieldButton>
      <MenuPopover minWidth={200}>
        <Show when={note} className="px-3 pt-2 pb-1 text-xs text-muted">
          {note}
        </Show>
        <ChoiceMenu
          label={label}
          mode="multiple"
          options={choose.options.map((option) => ({
            id: option.id,
            label: t(option.label),
          }))}
          selected={shown}
          onChange={change}
        />
      </MenuPopover>
    </MenuTrigger>
  )
}
