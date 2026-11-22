import { useState } from 'react'
import { Button, Input, NumberField } from 'react-aria-components'
import { cn, Icon } from '../../ui-kit'
import type { NumberEdit } from '../definition'

/**
 * A number edited in place (spec 7.3): React Aria's NumberField formats it for the
 * language (a comma in French) with the definition's number of decimals, keeps it
 * between its limits, and takes the arrow keys. Two small chevrons on the right step
 * it up and down; in the table they show under the pointer or the focus only. Leaving
 * the field, Enter or a step saves; an empty field saves "no value". A refused change
 * goes back; the collection reports why (decision 132).
 */
export function NumberCell<T>({
  record,
  edit,
  label,
  save,
  look = 'cell',
}: {
  record: T
  edit: NumberEdit<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
}) {
  const saved = edit.value(record)
  const [pending, setPending] = useState<number | null | undefined>(undefined)
  const shown = pending === undefined ? saved : pending
  const decimals = edit.decimals ?? 0

  async function commit(value: number) {
    const next = Number.isNaN(value) ? null : value
    if (next === saved) return
    setPending(next)
    try {
      await save(edit.patch(next))
    } catch {
      // the saved value comes back; the message says why
    } finally {
      setPending(undefined)
    }
  }

  const step =
    'flex h-[11px] w-4 cursor-pointer items-center justify-center rounded-[2px] text-muted outline-none data-[hovered]:bg-default data-[hovered]:text-foreground data-[focus-visible]:outline-1 data-[focus-visible]:outline-foreground data-[disabled]:cursor-default data-[disabled]:opacity-40'
  return (
    <NumberField
      aria-label={label}
      value={shown ?? NaN}
      onChange={(value) => void commit(value)}
      minValue={edit.min}
      maxValue={edit.max}
      step={edit.step ?? 10 ** -decimals}
      formatOptions={{
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }}
      className={cn(
        'group/number relative flex min-w-0 items-center',
        // In the panel the field is as wide as its number (the browser's
        // field-sizing), never the whole row.
        look === 'panel' && '-ms-2 w-fit max-w-full',
      )}
    >
      <Input
        placeholder="—"
        className={cn(
          'w-full min-w-0 cursor-text bg-transparent p-0 pe-6 tabular-nums outline-none placeholder:text-muted',
          look === 'panel' &&
            'w-auto min-w-14 rounded-[var(--field-radius)] px-2 py-1 pe-6 [field-sizing:content] hover:bg-default focus:bg-default',
        )}
      />
      <span
        className={cn(
          'absolute end-0 flex flex-col gap-px',
          look === 'cell' &&
            'opacity-0 group-focus-within/number:opacity-100 group-hover/number:opacity-100',
          look === 'panel' && 'end-1',
        )}
      >
        <Button slot="increment" className={step}>
          <Icon name="lucide/chevron-up" size={10} />
        </Button>
        <Button slot="decrement" className={step}>
          <Icon name="lucide/chevron-down" size={10} />
        </Button>
      </span>
    </NumberField>
  )
}
