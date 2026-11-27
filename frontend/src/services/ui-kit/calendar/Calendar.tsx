import FullCalendar, { useCalendarController } from '@fullcalendar/react'
import dayGrid from '@fullcalendar/react/daygrid'
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

/** Something placed on the calendar: dates as '2026-12-01', or with a time. */
export type CalendarEntry = {
  id: string
  title: string
  start: string
  /** Inclusive, as the person reads it ('until 5 December'). */
  end?: string | null
}

/** The day after an inclusive end day: FullCalendar's all-day ends are exclusive. */
const dayAfter = (day: string) => {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
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
  onOpen,
  renderEntry,
}: {
  label: string
  entries: CalendarEntry[]
  onRange: (range: { start: string; end: string }) => void
  onOpen?: (id: string) => void
  /** What an entry shows; its title by default. */
  renderEntry?: (id: string) => ReactNode
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
          plugins={[classic, dayGrid]}
          initialView="dayGridMonth"
          headerToolbar={false}
          // Day names on the left, in capitals; day numbers on two digits (01 … 31);
          // Saturday and Sunday on grey.
          dayHeaderAlign="start"
          dayHeaderClass={(day) => cn('uppercase', weekend(day.dow))}
          dayCellClass={(day) => weekend(day.dow)}
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
          }))}
          datesSet={(range) =>
            onRange({
              start: range.startStr.slice(0, 10),
              end: range.endStr.slice(0, 10),
            })
          }
          eventClick={(click) => onOpen?.(click.event.id)}
          eventContent={
            renderEntry && ((content) => renderEntry(content.event.id))
          }
        />
      </div>
    </section>
  )
}
