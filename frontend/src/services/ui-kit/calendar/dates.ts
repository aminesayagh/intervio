import type { EventApi } from '@fullcalendar/react'

/** The day after an inclusive end day: FullCalendar's all-day ends are exclusive. */
export const dayAfter = (day: string) => {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** Where an entry was dragged: its new start and inclusive end, stored as entries are. */
export type CalendarMove = { start: string; end: string | null }

const pad = (n: number) => String(n).padStart(2, '0')
/** A date as entries store it, in the browser's time zone: a day, or with its time. */
const stored = (date: Date, allDay: boolean) => {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return allDay
    ? day
    : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
/** An event's dates after a drag: FullCalendar's exclusive all-day end made inclusive. */
export function moved(event: EventApi): CalendarMove {
  const start = stored(event.start!, event.allDay)
  if (!event.end) return { start, end: null }
  const end = new Date(event.end)
  if (event.allDay) end.setDate(end.getDate() - 1)
  return { start, end: stored(end, event.allDay) }
}
