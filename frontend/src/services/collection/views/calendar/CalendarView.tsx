import { CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Calendar,
  PopoverDialog,
  Show,
  type CalendarEntry,
} from '../../../ui-kit'
import { useCollectionQuery } from '../../data/collectionQuery'
import type { DateField } from '../../definition'
import { DateCell } from '../../values/DateCell'
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
 *
 * A record the person may edit moves to another day by dragging, or is stretched
 * when the view has an end date (MAS-53); its calendar button changes the dates
 * with the date picker, from the keyboard too. Both go through the normal save.
 * A click on an empty day starts a new record on that day (MAS-54).
 *
 * Records without a date don't show on the month: the toolbar counts them, and
 * opens them as a list where each can be opened or given a date (MAS-55).
 */
export function CalendarView<T, C>({
  definition,
  label,
  query,
  context,
  onOpen,
  save,
  canEdit,
  onCreate,
  date,
  end,
  card = [],
}: Pick<
  ViewProps<T, C>,
  | 'definition'
  | 'label'
  | 'query'
  | 'context'
  | 'onOpen'
  | 'save'
  | 'canEdit'
  | 'onCreate'
> & { date: string; end?: string; card?: string[] }) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const [range, setRange] = useState<{ start: string; end: string } | null>(
    null,
  )
  const field = (id?: string) =>
    definition.columns.find((column) => column.id === id)?.field as
      DateField<T> | undefined
  const starts = field(date)
  const ends = field(end)
  const labelOf = (id: string) =>
    t(definition.columns.find((column) => column.id === id)?.label ?? id)
  const movable = (record: T) =>
    canEdit(record, date) && (!end || canEdit(record, end))
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
  // The view's records without a date, for the toolbar's count and list.
  const undated = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context,
    listing: {
      ...query,
      filters: { ...query.filters, [`${date}.empty`]: ['true'] },
    },
  })
  const undatedCount = undated.total ?? undated.items.length
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
            movable: movable(record),
            resizable: !!ends,
          },
        ]
      : []
  })
  return (
    <Calendar
      label={label}
      entries={range ? entries : []}
      onRange={setRange}
      toolbar={
        <Show when={undatedCount > 0}>
          <PopoverDialog
            label={t('collection:calendar.undatedList')}
            width={320}
            trigger={
              <Button size="sm" look="ghost" className="text-muted">
                {t('collection:calendar.undated', { count: undatedCount })}
              </Button>
            }
          >
            <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto p-2 text-sm">
              {undated.items.map((record) => (
                <li
                  key={definition.getId(record)}
                  className="flex items-center gap-2"
                >
                  <Button
                    size="sm"
                    look="ghost"
                    className="min-w-0 flex-1 justify-start overflow-hidden px-1 font-normal"
                    onPress={() => onOpen?.(definition.getId(record))}
                  >
                    <span className="truncate">{name(record)}</span>
                  </Button>
                  <Show when={starts && canEdit(record, date) && starts}>
                    {(dates) => (
                      <DateCell
                        record={record}
                        edit={dates}
                        label={labelOf(date)}
                        look="panel"
                        save={(patch) =>
                          save(record, patch, { label: labelOf(date) })
                        }
                      />
                    )}
                  </Show>
                </li>
              ))}
              {/* The Show inside the item: a wrapper directly in <ul> is invalid. */}
              <li>
                <Show when={undated.hasNextPage}>
                  <Button
                    size="sm"
                    look="ghost"
                    className="w-full"
                    isDisabled={undated.isFetchingNextPage}
                    onPress={() => void undated.fetchNextPage()}
                  >
                    {t('collection:calendar.more')}
                  </Button>
                </Show>
              </li>
            </ul>
          </PopoverDialog>
        </Show>
      }
      onDayPress={
        onCreate &&
        starts &&
        ((day) =>
          onCreate({ ...starts.patch(day), ...(ends && ends.patch(day)) }))
      }
      onMove={(id, move) => {
        const record = byId.get(id)
        if (!record || !starts) return Promise.resolve()
        return save(
          record,
          {
            ...starts.patch(move.start),
            // Back on one day: it ends that day.
            ...(ends && ends.patch(move.end ?? move.start)),
          },
          { label: labelOf(date) },
        )
      }}
      renderEntry={(id) => (
        <Show
          as="span"
          className="flex w-full min-w-0 items-center gap-2 overflow-hidden px-1"
          when={byId.get(id)}
        >
          {(record) => (
            <>
              <Button
                look="ghost"
                size="sm"
                className="h-auto min-w-0 flex-1 justify-start gap-2 overflow-hidden px-0 font-normal data-[hovered]:bg-transparent"
                onPress={() => onOpen?.(definition.getId(record))}
              >
                <span className="truncate font-medium">{name(record)}</span>
                {shown.map((column) => (
                  <span
                    key={column.id}
                    className="flex min-w-0 items-center text-xs text-muted"
                  >
                    {column.cell(record)}
                  </span>
                ))}
              </Button>
              <Show as="span" className="ms-auto flex" when={movable(record)}>
                <PopoverDialog
                  label={t('collection:calendar.changeDate', {
                    name: name(record),
                  })}
                  width={240}
                  trigger={
                    <Button
                      size="sm"
                      look="ghost"
                      className="size-5 min-w-0 px-0"
                      aria-label={t('collection:calendar.changeDate', {
                        name: name(record),
                      })}
                    >
                      <CalendarDays size={12} />
                    </Button>
                  }
                >
                  <div className="flex flex-col gap-2 p-2 text-sm">
                    {[
                      [date, starts],
                      [end, ends],
                    ].map(([id, edit]) => (
                      <Show
                        key={String(id)}
                        when={id && edit ? (edit as DateField<T>) : null}
                      >
                        {(dates) => (
                          <label className="flex items-center justify-between gap-2">
                            <span className="text-muted">
                              {labelOf(String(id))}
                            </span>
                            <DateCell
                              record={record}
                              edit={dates}
                              label={labelOf(String(id))}
                              look="panel"
                              save={(patch) =>
                                save(record, patch, {
                                  label: labelOf(String(id)),
                                })
                              }
                            />
                          </label>
                        )}
                      </Show>
                    ))}
                  </div>
                </PopoverDialog>
              </Show>
            </>
          )}
        </Show>
      )}
    />
  )
}
