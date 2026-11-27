import type { EventApi } from '@fullcalendar/react'
import { expect, test } from 'vitest'
import { moved } from './dates'

const event = (start: string, end: string | null, allDay: boolean) =>
  ({
    start: new Date(start),
    end: end ? new Date(end) : null,
    allDay,
  }) as EventApi

test("a dragged entry's dates, as entries store them (MAS-53)", () => {
  // All day: FullCalendar's end is the day after; ours is the last day.
  expect(moved(event('2026-12-10T00:00', '2026-12-13T00:00', true))).toEqual({
    start: '2026-12-10',
    end: '2026-12-12',
  })
  expect(moved(event('2026-12-10T00:00', null, true))).toEqual({
    start: '2026-12-10',
    end: null,
  })
  // With a time: kept as it was, in the browser's time zone.
  expect(moved(event('2026-12-10T09:30', '2026-12-10T11:00', false))).toEqual({
    start: '2026-12-10T09:30',
    end: '2026-12-10T11:00',
  })
})
