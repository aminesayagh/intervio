import {
  DateFormatter,
  getLocalTimeZone,
  type DateValue,
} from '@internationalized/date'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type FocusEvent,
} from 'react'
import { useLocale } from '../../ui-kit'

/**
 * Whether a value's editor is mounted. A date, a period or a number shows as text
 * until the person reaches it (decision 139): in the table, its row under the pointer
 * or the focus; in the panel, the value itself. React Aria's date and number fields
 * are the costliest part of a row and of a panel, and most values are only looked at.
 * Where nothing says otherwise (a new record), editors are awake.
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

/**
 * When the focus woke a value (it reached the text), the focus goes on to the editor
 * once it is there: the control marked `data-wake`, else its first field or button. Put `boxRef` and `onFocusCapture` on an element around the value.
 */
export function useHandFocus<E extends HTMLElement>(awake: boolean) {
  const boxRef = useRef<E>(null)
  const pending = useRef(false)
  useEffect(() => {
    if (!awake || !pending.current) return
    pending.current = false
    // After a frame: when the focused text leaves, React Aria may first put the focus
    // back where it was (a table's row), in its own effects.
    const frame = requestAnimationFrame(() => {
      const box = boxRef.current
      // The marked control first: a list of selectors would match in page order.
      ;(
        box?.querySelector<HTMLElement>('[data-wake]') ??
        box?.querySelector<HTMLElement>(
          'input:not([type="file"]), [role="spinbutton"], button',
        )
      )?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [awake])
  return {
    boxRef,
    onFocusCapture: (event: FocusEvent) => {
      if ((event.target as HTMLElement).dataset.asleep !== undefined)
        pending.current = true
    },
  }
}
