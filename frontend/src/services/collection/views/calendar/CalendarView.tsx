import { useEffect, useState } from 'react'
import { Calendar, Show, type CalendarEntry } from '../../../ui-kit'
import { useCollectionQuery } from '../../data/collectionQuery'
import type { DateField } from '../../definition'
import type { ViewProps } from '../viewProps'

/** The day before '2026-12-01': "after" is strict, and the range's first day counts. */
const dayBefore = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/**
 * A calendar of the records (MAS-52), by the view's `date` column, to its `end`
 * column when it has one. It asks for the list's query plus the days on screen
 * ("after" the day before the first, "before" the day after the last), and loads
 * every page of them. A record shows its name and the view's `card` columns, and
 * opens in the panel.
 */
export function CalendarView<T, C>({
  definition,
  label,
  query,
  context,
  onOpen,
  date,
  end,
  card = [],
}: Pick<
  ViewProps<T, C>,
  'definition' | 'label' | 'query' | 'context' | 'onOpen'
> & { date: string; end?: string; card?: string[] }) {
  const [range, setRange] = useState<{ start: string; end: string } | null>(
    null,
  )
  const field = (id?: string) =>
    definition.columns.find((column) => column.id === id)?.field as
      DateField<T> | undefined
  const starts = field(date)
  const ends = field(end)
  // ponytail: filtered on the start date only, so a record that starts before the
  // range and ends inside it is missing; filter on `end` too when ranges are common.
  const list = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context,
    listing: {
      ...query,
      filters: {
        ...query.filters,
        ...(range && {
          [`${date}.gt`]: [dayBefore(range.start)],
          [`${date}.lt`]: [range.end],
        }),
      },
    },
  })
  // Every page of the days on screen: a calendar has no scrolling to load more.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  useEffect(() => {
    if (range && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [range, hasNextPage, isFetchingNextPage, fetchNextPage])
  const name = (record: T) =>
    definition.panel?.title(record) ?? definition.getId(record)
  const byId = new Map(list.items.map((r) => [definition.getId(r), r]))
  const shown = definition.columns.filter((column) => card.includes(column.id))
  const entries = list.items.flatMap((record): CalendarEntry[] => {
    const start = starts?.value(record)
    return start
      ? [
          {
            id: definition.getId(record),
            title: name(record),
            start,
            end: ends?.value(record),
          },
        ]
      : []
  })
  return (
    <Calendar
      label={label}
      entries={range ? entries : []}
      onRange={setRange}
      onOpen={onOpen && ((id) => onOpen(id))}
      renderEntry={(id) => (
        <Show
          as="span"
          className="flex w-full min-w-0 items-center gap-2 overflow-hidden px-1"
          when={byId.get(id)}
        >
          {(record) => (
            <>
              <span className="truncate font-medium">{name(record)}</span>
              {shown.map((column) => (
                <span
                  key={column.id}
                  className="flex min-w-0 items-center text-xs text-muted"
                >
                  {column.cell(record)}
                </span>
              ))}
            </>
          )}
        </Show>
      )}
    />
  )
}
