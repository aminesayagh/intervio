import { Dropdown, Label } from '@heroui/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChoiceEdit } from './definition'

/**
 * A table cell whose value is chosen from a list (a status): it shows the column's
 * own display (the chip) unchanged, with a pointer cursor; a click opens the
 * choices, and a choice saves at once. A refused choice comes back to the saved
 * one, with a short message under the cell.
 */
export function ChoiceCell<T>({
  record,
  choose,
  render,
  label,
  namespace,
  save,
}: {
  record: T
  choose: ChoiceEdit<T>
  /** The column's display, for a record (with the chosen value while it saves). */
  render: (record: T) => ReactNode
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const saved = choose.value(record)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const shown = pending ?? saved

  async function pick(id: string) {
    if (id === saved) return
    setPending(id)
    setError(null)
    try {
      await save(choose.patch(id))
    } catch {
      setError(t('collection:error.save'))
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          aria-label={`${label}: ${t(choose.options.find((o) => o.id === shown)?.label ?? shown)}`}
          aria-busy={pending ? true : undefined}
          className="flex max-w-full cursor-pointer rounded-[var(--field-radius)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {render(
            shown === saved ? record : { ...record, ...choose.patch(shown) },
          )}
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start" className="min-w-[180px]">
          <Dropdown.Menu
            aria-label={label}
            selectionMode="single"
            selectedKeys={new Set([shown])}
            onAction={(key) => pick(String(key))}
          >
            {choose.options.map((option) => (
              <Dropdown.Item
                key={option.id}
                id={option.id}
                textValue={t(option.label)}
              >
                <Label>{t(option.label)}</Label>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {error && (
        <p role="alert" className="truncate text-xs text-danger">
          {error}
        </p>
      )}
    </>
  )
}
