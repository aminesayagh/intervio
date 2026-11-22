import {
  DatePicker as AriaDatePicker,
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  type DatePickerProps,
  type DateValue,
} from 'react-aria-components'
import { cn } from '../cn'
import { Icon } from '../Icon'

const iconButton =
  'flex cursor-pointer items-center justify-center rounded-[var(--field-radius)] text-muted outline-none data-[hovered]:bg-default data-[hovered]:text-foreground data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground'

/**
 * A date (and, with `granularity`, a time): React Aria's DatePicker. The field is
 * made of segments (month, day, year), typed or changed with the arrow keys, in the
 * language's order; a button opens a month calendar. In the table (`cell`) the
 * button shows under the pointer or the focus only.
 */
export function DatePicker<T extends DateValue>({
  look = 'cell',
  ...props
}: Omit<DatePickerProps<T>, 'className'> & { look?: 'cell' | 'panel' }) {
  return (
    <AriaDatePicker
      {...props}
      className={cn(
        'group/date flex min-w-0',
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
        <DateInput className="flex min-w-0 tabular-nums">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded-[2px] px-px outline-none data-[focused]:bg-foreground data-[focused]:text-background data-[placeholder]:text-muted data-[type=literal]:px-0"
            />
          )}
        </DateInput>
        <Button
          className={cn(
            iconButton,
            'p-0.5',
            look === 'cell' &&
              'opacity-0 group-focus-within/date:opacity-100 group-hover/date:opacity-100 data-[focus-visible]:opacity-100',
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
          <Calendar>
            <header className="mb-2 flex items-center justify-between gap-2">
              <Button slot="previous" className={cn(iconButton, 'size-7')}>
                <Icon name="lucide/chevron-left" size={14} />
              </Button>
              <Heading className="font-medium" />
              <Button slot="next" className={cn(iconButton, 'size-7')}>
                <Icon name="lucide/chevron-right" size={14} />
              </Button>
            </header>
            <CalendarGrid className="border-separate border-spacing-0.5">
              {(date) => (
                <CalendarCell
                  date={date}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-[var(--field-radius)] tabular-nums outline-none data-[disabled]:opacity-40 data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground data-[hovered]:bg-default data-[outside-month]:hidden data-[selected]:bg-foreground data-[selected]:text-background"
                />
              )}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}
