import {
  parseDate,
  parseDateTime,
  type DateValue,
} from '@internationalized/date'
import { useRef, useState } from 'react'
import { DatePicker } from '../../ui-kit'
import type { DateField } from '../definition'
import { Asleep } from './Asleep'
import { useAwake, useDateText } from './awake'

/** A stored date ('2026-12-01', or with a time '2026-12-01T09:30') as a picker value. */
function toValue(iso: string | null, time: boolean): DateValue | null {
  if (!iso) return null
  return time ? parseDateTime(iso.slice(0, 16)) : parseDate(iso.slice(0, 10))
}

/** A picker value as it is stored: '2026-12-01', or '2026-12-01T09:30'. */
function toIso(value: DateValue | null, time: boolean) {
  if (!value) return null
  return time ? value.toString().slice(0, 16) : value.toString().slice(0, 10)
}

/**
 * A date edited in place (spec 7.3.0): typed in its segments or picked in the
 * calendar. It saves when the field is left or a day is picked, not on each key; a
 * refused change goes back, and the collection reports why (decision 132).
 */
export function DateCell<T>({
  record,
  edit,
  label,
  save,
  look = 'cell',
}: {
  record: T
  edit: DateField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
}) {
  const time = edit.time ?? false
  const saved = toIso(toValue(edit.value(record), time), time)
  // What is typed or picked, until it is saved.
  const [draft, setDraft] = useState<DateValue | null | undefined>(undefined)
  const latest = useRef<DateValue | null | undefined>(undefined)
  const awake = useAwake()
  const text = useDateText(time)

  function change(value: DateValue | null) {
    latest.current = value
    setDraft(value)
  }
  async function commit() {
    const next = latest.current
    latest.current = undefined
    if (next === undefined) return
    const iso = toIso(next, time)
    if (iso === saved) return setDraft(undefined)
    try {
      await save(edit.patch(iso))
    } catch {
      // the saved date comes back; the message says why
    } finally {
      setDraft(undefined)
    }
  }

  if (!awake)
    return (
      <Asleep text={text(toValue(saved, time))} look={look} icon="calendar" />
    )
  return (
    <DatePicker
      aria-label={label}
      look={look}
      granularity={time ? 'minute' : 'day'}
      value={draft === undefined ? toValue(saved, time) : draft}
      onChange={change}
      onBlur={() => void commit()}
      onOpenChange={(open) => !open && void commit()}
      minValue={edit.min ? (toValue(edit.min, time) ?? undefined) : undefined}
      maxValue={edit.max ? (toValue(edit.max, time) ?? undefined) : undefined}
    />
  )
}
