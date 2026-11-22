import { useContext } from 'react'
import type {
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  Ref,
} from 'react'
import {
  Cell as AriaCell,
  Column as AriaColumn,
  ColumnResizer as AriaColumnResizer,
  Row as AriaRow,
  Table as AriaTable,
  TableHeader as AriaTableHeader,
  TableLoadMoreItem as AriaTableLoadMoreItem,
  TableStateContext,
  type CellProps,
  type ColumnProps,
  type RowProps,
  type TableHeaderProps,
  type TableProps,
} from 'react-aria-components'
import { cn } from '../cn'
import { Icon } from '../Icon'
import { Show } from '../views/Show'

export {
  Collection as RowCollection,
  ResizableTableContainer,
  TableBody,
  TableLayout,
  Virtualizer,
  type Selection,
  type SortDescriptor,
} from 'react-aria-components'

/**
 * A long list of records as a table: React Aria's Table (a grid: arrow keys between
 * cells, row actions, sorting, selection), virtualized by its Virtualizer and
 * TableLayout, styled once here with Intervio's tokens.
 */
export function Table({
  className,
  ref,
  ...props
}: Omit<TableProps, 'className'> & {
  className?: string
  /** The element that scrolls (the virtualized table scrolls itself). */
  ref?: Ref<HTMLDivElement>
}) {
  return (
    <AriaTable
      {...props}
      ref={ref as unknown as Ref<HTMLTableElement>}
      className={cn(
        // It fills what its column leaves (a flex item), and scrolls inside.
        'scroll-quiet min-h-0 w-full flex-1 overflow-auto text-start outline-none [--scroll-quiet-top:2rem]',
        className,
      )}
    />
  )
}

/** The pinned row of column titles, with the rule under it. */
export function TableHeader<T extends object>({
  className,
  ...props
}: Omit<TableHeaderProps<T>, 'className'> & { className?: string }) {
  return (
    <AriaTableHeader
      {...props}
      className={cn(
        'sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--foreground)]',
        className,
      )}
    />
  )
}

/**
 * A column title. A sortable one shows the sort arrows (↕, then ↑ or ↓ when sorted)
 * and sorts when pressed; with `resizable`, a resizer sits on its right edge.
 */
export function Column({
  children,
  resizable = false,
  className,
  ...props
}: Omit<ColumnProps, 'className' | 'children'> & {
  children: ReactNode
  resizable?: boolean
  className?: string
}) {
  return (
    <AriaColumn
      {...props}
      className={cn(
        'group/column relative h-8 px-3 text-start align-middle text-xs font-normal text-muted outline-none data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-foreground',
        props.allowsSorting && 'cursor-pointer data-[hovered]:text-foreground',
        className,
      )}
    >
      {({ allowsSorting, sortDirection }) => (
        <span className="flex items-center gap-1">
          <span className={cn('truncate', sortDirection && 'text-foreground')}>
            {children}
          </span>
          <Show as="span" when={allowsSorting} className="flex shrink-0">
            <Icon
              name={
                sortDirection === 'ascending'
                  ? 'lucide/arrow-up'
                  : sortDirection === 'descending'
                    ? 'lucide/arrow-down'
                    : 'lucide/arrow-up-down'
              }
              size={12}
              className={sortDirection ? 'text-foreground' : undefined}
            />
          </Show>
          <Show as="span" when={resizable} className="contents">
            <AriaColumnResizer className="absolute inset-y-1 end-0 w-1.5 cursor-col-resize touch-none rounded-full outline-none data-[focus-visible]:bg-foreground data-[hovered]:bg-border data-[resizing]:bg-foreground" />
          </Show>
        </span>
      )}
    </AriaColumn>
  )
}

/** A record's row: a pointer when it opens the record, marked when `current`. */
export function Row<T extends object>({
  current = false,
  className,
  ...props
}: Omit<RowProps<T>, 'className'> & { current?: boolean; className?: string }) {
  return (
    <AriaRow
      {...props}
      data-current={current || undefined}
      aria-current={current || undefined}
      className={cn(
        'group border-b border-border outline-none data-[focus-visible]:bg-default data-[href]:cursor-pointer data-[selected]:bg-default',
        props.onAction &&
          'cursor-pointer data-[hovered]:bg-[color-mix(in_srgb,var(--default)_50%,transparent)]',
        current && 'bg-default shadow-[inset_3px_0_0_var(--foreground)]',
        className,
      )}
    />
  )
}

/** Fields: what can be typed in, and the date and number segments. */
const TEXT_ENTRY =
  'input, textarea, [contenteditable="true"], [role="spinbutton"], [role="textbox"]'

/**
 * STAND-IN for React Aria's `keyboardNavigationBehavior="tab"` (documented, not yet
 * in react-aria-components 1.22.1). When a release has it: pass it to <Table>, and
 * delete these four functions and their uses in Cell below.
 *
 * A field in a cell owns every key but Tab (the arrows move its caret or step its
 * value, Enter saves it, letters are typed), so the grid doesn't navigate, act or
 * search with them; Enter and Space on a button or link press that button, not the
 * row; and a press on a field, a button or a link doesn't run the row's action.
 */
function keepKeysInFields(event: KeyboardEvent) {
  if (event.key === 'Tab') return
  const target = event.target as HTMLElement
  if (target.closest(TEXT_ENTRY)) return event.stopPropagation()
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    target.closest('button, a')
  )
    event.stopPropagation()
}
function keepPressInControls(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (target.closest(`${TEXT_ENTRY}, button, a, label`)) event.stopPropagation()
}
/** Focus on a field or a button stays there: the grid would move it to the row. */
function keepFocusInControls(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (target.closest(`${TEXT_ENTRY}, button, a`)) event.stopPropagation()
}
/**
 * While a field in the cell has the focus, the grid's arrow-key navigation is off
 * (the switch React Aria itself uses while a column is resized): its cells handle the
 * arrows before the field could, in the capture phase.
 */
function useFieldKeepsArrows() {
  const state = useContext(TableStateContext)
  const set = (event: FocusEvent, on: boolean) => {
    if ((event.target as HTMLElement).closest(TEXT_ENTRY))
      state?.setKeyboardNavigationDisabled(on)
  }
  return {
    onFocusCapture: (event: FocusEvent) => set(event, true),
    onBlurCapture: (event: FocusEvent) => set(event, false),
  }
}

/**
 * The cell's content with the stand-in's handlers. It is a component of its own: React
 * Aria builds its collection in a first pass where the table's state isn't there yet;
 * the content renders later inside the table, where it is.
 */
function CellContent({ children }: { children: ReactNode }) {
  const arrows = useFieldKeepsArrows()
  return (
    <div
      className="min-w-0"
      onKeyDown={keepKeysInFields}
      onPointerDown={keepPressInControls}
      onFocus={keepFocusInControls}
      onBlur={keepFocusInControls}
      {...arrows}
    >
      {children}
    </div>
  )
}

/** A cell: its content, kept on one line; fields in it keep their keys (above). */
export function Cell({
  children,
  className,
  ...props
}: Omit<CellProps, 'className' | 'children'> & {
  children: ReactNode
  className?: string
}) {
  return (
    <AriaCell
      {...props}
      className={cn(
        'truncate px-3 py-3 align-middle outline-none data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-foreground',
        className,
      )}
    >
      <CellContent>{children}</CellContent>
    </AriaCell>
  )
}
/** The end of the list: loads the next page when it comes near (infinite scroll). */
export function TableLoadMoreItem({
  onLoadMore,
  isLoading,
  label,
}: {
  onLoadMore: () => void
  isLoading: boolean
  label: string
}) {
  return (
    <AriaTableLoadMoreItem
      onLoadMore={onLoadMore}
      isLoading={isLoading}
      className="outline-none"
    >
      <div
        role="status"
        aria-label={label}
        className="flex items-center gap-4 border-b border-border px-3 py-3"
      >
        <span className="h-3 w-40 rounded-[var(--field-radius)] bg-default" />
        <span className="h-3 w-24 rounded-[var(--field-radius)] bg-default" />
      </div>
    </AriaTableLoadMoreItem>
  )
}
