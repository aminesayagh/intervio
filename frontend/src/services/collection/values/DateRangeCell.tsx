import {
  parseDate,
  parseDateTime,
  type DateValue,
} from '@internationalized/date'
import { useRef, useState } from 'react'
import { DateRangePicker } from '../../ui-kit'
import type { DateRange, DateRangeField } from '../definition'

type Picked = { start: DateValue; end: DateValue } | null

function toValue(
  iso: string | null | undefined,
  time: boolean,
): DateValue | null {
  if (!iso) return null
  return time ? parseDateTime(iso.slice(0, 16)) : parseDate(iso.slice(0, 10))
}
function toRange(range: DateRange | null, time: boolean): Picked {
  const start = toValue(range?.start, time)
  const end = toValue(range?.end, time)
  return start && end ? { start, end } : null
}
const toIso = (value: DateValue, time: boolean) =>
  time ? value.toString().slice(0, 16) : value.toString().slice(0, 10)
function toStored(picked: Picked, time: boolean): DateRange | null {
  return picked
    ? { start: toIso(picked.start, time), end: toIso(picked.end, time) }
    : null
}
const same = (a: DateRange | null, b: DateRange | null) =>
  a?.start === b?.start && a?.end === b?.end

/**
 * A period edited in place (spec 7.3.0): its start and end typed in their segments,
 * or picked in the range calendar. It saves when the field is left or the range is
 * complete, not on each key; a refused change goes back, and the collection reports
 * why (decision 132).
 */
export function DateRangeCell<T>({
  record,
  edit,
  label,
  save,
  look = 'cell',
}: {
  record: T
  edit: DateRangeField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
}) {
  const time = edit.time ?? false
  const saved = toStored(toRange(edit.value(record), time), time)
  const [draft, setDraft] = useState<Picked | undefined>(undefined)
  const latest = useRef<Picked | undefined>(undefined)

  function change(picked: Picked) {
    latest.current = picked
    setDraft(picked)
  }
  async function commit() {
    const next = latest.current
    latest.current = undefined
    if (next === undefined) return
    const stored = toStored(next, time)
    if (same(stored, saved)) return setDraft(undefined)
    try {
      await save(edit.patch(stored))
    } catch {
      // the saved period comes back; the message says why
    } finally {
      setDraft(undefined)
    }
  }

  return (
    <DateRangePicker
      aria-label={label}
      look={look}
      granularity={time ? 'minute' : 'day'}
      value={draft === undefined ? toRange(saved, time) : draft}
      onChange={change}
      onBlur={() => void commit()}
      onOpenChange={(open) => !open && void commit()}
      minValue={toValue(edit.min, time) ?? undefined}
      maxValue={toValue(edit.max, time) ?? undefined}
    />
  )
}
