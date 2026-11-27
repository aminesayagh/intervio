import { Draggable } from '@fullcalendar/react/interaction'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A list outside the calendar whose items drag onto its days (MAS-60): each item
 * that carries `data-calendar-id` (and `data-calendar-title`, shown while it is
 * dragged). The calendar's `onDrop` gets that id and the day.
 */
export function CalendarDragSource({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const draggable = new Draggable(ref.current!, {
      itemSelector: '[data-calendar-id]',
      // Not added by FullCalendar: the record comes back from the save.
      eventData: (item) => ({
        title: item.dataset.calendarTitle ?? '',
        create: false,
      }),
    })
    return () => draggable.destroy()
  }, [])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
