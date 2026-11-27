import FullCalendar, { useCalendarController } from '@fullcalendar/react'
import dayGrid from '@fullcalendar/react/daygrid'
import interaction from '@fullcalendar/react/interaction'
import french from '@fullcalendar/react/locales/fr'
import '@fullcalendar/react/skeleton.css'
import classic from '@fullcalendar/react/themes/classic'
import '@fullcalendar/react/themes/classic/theme.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../aria/Button'
import { cn } from '../cn'
import './calendar.css'
import { dayAfter, moved, type CalendarMove } from './dates'

/** Something placed on the calendar: dates as '2026-12-01', or with a time. */
export type CalendarEntry = {
  id: string
  title: string
  start: string
  /** Inclusive, as the person reads it ('until 5 December'). */
  end?: string | null
  /** Dragged to another day (MAS-53). */
  movable?: boolean
  /** Stretched to change its end: when the calendar has an end date. */
  resizable?: boolean
}

/** Saturday and Sunday (0 and 6), on the grey background. */
const weekend = (dow: number) =>
  (dow === 0 || dow === 6) && 'bg-[var(--color-background-secondary)]'

/**
 * A calendar of one month at a time (MAS-52): FullCalendar draws the month; the
 * toolbar above it is Intervio's (React Aria). Dates show in the browser's
 * time zone, and the week starts as the language says. `onRange` gives the days on
 * screen (the end excluded) each time they change, so only those load.
 */
export function Calendar({
  label,
  entries,
  onRange,
  onMove,
  onDayPress,
  onDrop,
  renderEntry,
  toolbar,
}: {
  label: string
  entries: CalendarEntry[]
  onRange: (range: { start: string; end: string }) => void
  /**
   * Saves an entry dragged or stretched to other days: it moves at once, and goes
   * back if this fails.
   */
  onMove?: (id: string, move: CalendarMove) => Promise<void>
  /** A click on a day, outside its entries ('2026-12-01'): a new one there (MAS-54). */
  onDayPress?: (day: string) => void
  /** An item of a `CalendarDragSource` dropped on a day: its id and the day (MAS-60). */
  onDrop?: (id: string, day: string) => void
  /**
   * What an entry shows, its buttons included (opening it, changing its date):
   * FullCalendar's own element stays a plain box, so they are never nested.
   */
  renderEntry: (id: string) => ReactNode
  /** More in the toolbar, after the month's name (records without a date). */
  toolbar?: ReactNode
}) {
  const { t, i18n } = useTranslation('ui-kit')
  const controller = useCalendarController()
  return (
    <section
      aria-label={label}
      className="intervio-calendar flex min-h-0 flex-1 flex-col gap-2"
    >
      {/* The month on the left, the way to move on the right. */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 aria-live="polite" className="text-sm font-medium">
          {controller.view?.title}
        </h2>
        {toolbar}
        <div className="ms-auto flex items-center gap-1">
          <Button
            size="sm"
            look="ghost"
            className="w-8 px-0"
            aria-label={t('calendar.previous')}
            onPress={() => controller.prev()}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" look="ghost" onPress={() => controller.today()}>
            {t('calendar.today')}
          </Button>
          <Button
            size="sm"
            look="ghost"
            className="w-8 px-0"
            aria-label={t('calendar.next')}
            onPress={() => controller.next()}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 text-xs">
        <FullCalendar
          controller={controller}
          plugins={[classic, dayGrid, interaction]}
          initialView="dayGridMonth"
          headerToolbar={false}
          // Day names on the left, in capitals; day numbers on two digits (01 … 31);
          // Saturday and Sunday on grey.
          dayHeaderAlign="start"
          dayHeaderClass={(day) => cn('uppercase', weekend(day.dow))}
          dayCellClass={(day) =>
            cn(weekend(day.dow), onDayPress && 'cursor-pointer')
          }
          dateClick={(click) => onDayPress?.(click.dateStr.slice(0, 10))}
          droppable={!!onDrop}
          drop={(dropped) => {
            const id = dropped.draggedEl.dataset.calendarId
            if (id) onDrop?.(id, dropped.dateStr.slice(0, 10))
          }}
          dayCellTopContent={(day) =>
            String(day.date.getDate()).padStart(2, '0')
          }
          height="100%"
          locale={i18n.language === 'fr' ? french : 'en'}
          events={entries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            start: entry.start,
            // A day's end is inclusive for the person, exclusive for FullCalendar.
            end:
              entry.end && !entry.end.includes('T')
                ? dayAfter(entry.end)
                : (entry.end ?? undefined),
            allDay: !entry.start.includes('T'),
            startEditable: !!onMove && !!entry.movable,
            durationEditable: !!onMove && !!entry.movable && !!entry.resizable,
          }))}
          // Saved through onMove; back where it was if the save fails.
          eventDrop={(drop) =>
            void onMove?.(drop.event.id, moved(drop.event)).catch(drop.revert)
          }
          eventResize={(resize) =>
            void onMove?.(resize.event.id, moved(resize.event)).catch(
              resize.revert,
            )
          }
          datesSet={(range) =>
            onRange({
              start: range.startStr.slice(0, 10),
              end: range.endStr.slice(0, 10),
            })
          }
          eventContent={(content) => renderEntry(content.event.id)}
        />
      </div>
    </section>
  )
}
