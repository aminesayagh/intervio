import {
  DateFormatter,
  getLocalTimeZone,
  type DateValue,
} from '@internationalized/date'
import { createContext, useContext } from 'react'
import { useLocale } from '../../ui-kit'

/**
 * Whether a cell's editor is mounted. A table cell holding a date or a number shows
 * it as text until its row is under the pointer or the focus: React Aria's date and
 * number fields are the costliest part of a row, and most rows are only looked at.
 * Outside the table (the panel, a new record), editors are always awake.
 */
export const Awake = createContext(true)
export const useAwake = () => useContext(Awake)

/** A date as the date field shows it: its segments, in the language's order. */
export function useDateText(time: boolean) {
  const { locale } = useLocale()
  const format = new DateFormatter(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
  return (value: DateValue | null) =>
    value ? format.format(value.toDate(getLocalTimeZone())) : null
}

/** A number as the number field shows it. */
export function useNumberText(decimals: number) {
  const { locale } = useLocale()
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (value: number | null) =>
    value === null ? null : format.format(value)
}
