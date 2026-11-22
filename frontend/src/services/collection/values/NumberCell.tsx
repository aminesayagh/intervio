import { useState } from 'react'
import { NumberInput } from '../../ui-kit'
import type { NumberField } from '../definition'
import { Asleep } from './Asleep'
import { useAwake, useNumberText } from './awake'

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
  edit: NumberField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
}) {
  const saved = edit.value(record)
  const [pending, setPending] = useState<number | null | undefined>(undefined)
  const shown = pending === undefined ? saved : pending
  const decimals = edit.decimals ?? 0
  const awake = useAwake()
  const text = useNumberText(decimals)

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

  if (!awake) return <Asleep text={text(shown)} end />
  return (
    <NumberInput
      aria-label={label}
      look={look}
      value={shown ?? NaN}
      onChange={(value) => void commit(value)}
      minValue={edit.min}
      maxValue={edit.max}
      step={edit.step ?? 10 ** -decimals}
      formatOptions={{
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }}
    />
  )
}
