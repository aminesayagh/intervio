import {
  DateRangePicker as AriaDateRangePicker,
  Button,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  RangeCalendar,
  type DateRangePickerProps,
  type DateValue,
} from 'react-aria-components'
import { cn } from '../cn'
import { Icon } from '../Icon'

const iconButton =
  'flex cursor-pointer items-center justify-center rounded-[var(--field-radius)] text-muted outline-none data-[hovered]:bg-default data-[hovered]:text-foreground data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground'

const segment =
  'rounded-[2px] px-px outline-none data-[focused]:bg-foreground data-[focused]:text-background data-[placeholder]:text-muted data-[type=literal]:px-0'

/**
 * A period: React Aria's DateRangePicker. Two date fields (start and end) in one
 * control, and a button that opens a range calendar: a first click sets the start,
 * a second the end, the days between are marked. In the table (`cell`) the button
 * shows under the pointer or the focus only.
 */
export function DateRangePicker<T extends DateValue>({
  look = 'cell',
  ...props
}: Omit<DateRangePickerProps<T>, 'className'> & { look?: 'cell' | 'panel' }) {
  return (
    <AriaDateRangePicker
      {...props}
      className={cn(
        'group/range flex min-w-0',
        look === 'panel' && '-ms-2 w-fit max-w-full',
      )}
    >
      <Group
        className={cn(
          'flex min-w-0 items-center gap-1 rounded-[var(--field-radius)]',
          look === 'panel' &&
            'px-2 py-1 data-[focus-within]:bg-default data-[hovered]:bg-default',
        )}
      >
        <DateInput slot="start" className="flex tabular-nums">
          {(part) => <DateSegment segment={part} className={segment} />}
        </DateInput>
        <span aria-hidden className="text-muted">
          –
        </span>
        <DateInput slot="end" className="flex tabular-nums">
          {(part) => <DateSegment segment={part} className={segment} />}
        </DateInput>
        <Button
          className={cn(
            iconButton,
            'p-0.5',
            look === 'cell' &&
              'opacity-0 group-focus-within/range:opacity-100 group-hover/range:opacity-100 data-[focus-visible]:opacity-100',
          )}
        >
          <Icon name="lucide/calendar" size={12} />
        </Button>
      </Group>
      <Popover
        placement="bottom start"
        offset={4}
        className="rounded-[var(--field-radius)] border border-border bg-surface p-3 text-sm shadow-md outline-none"
      >
        <Dialog className="outline-none">
          <RangeCalendar>
            <header className="mb-2 flex items-center justify-between gap-2">
              <Button slot="previous" className={cn(iconButton, 'size-7')}>
                <Icon name="lucide/chevron-left" size={14} />
              </Button>
              <Heading className="font-medium" />
              <Button slot="next" className={cn(iconButton, 'size-7')}>
                <Icon name="lucide/chevron-right" size={14} />
              </Button>
            </header>
            <CalendarGrid className="border-separate border-spacing-y-0.5">
              {(date) => (
                <CalendarCell
                  date={date}
                  className="flex size-8 cursor-pointer items-center justify-center tabular-nums outline-none data-[disabled]:opacity-40 data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground data-[hovered]:bg-default data-[outside-month]:hidden data-[selected]:bg-default data-[selection-end]:rounded-e-[var(--field-radius)] data-[selection-end]:bg-foreground data-[selection-end]:text-background data-[selection-start]:rounded-s-[var(--field-radius)] data-[selection-start]:bg-foreground data-[selection-start]:text-background"
                />
              )}
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  )
}
