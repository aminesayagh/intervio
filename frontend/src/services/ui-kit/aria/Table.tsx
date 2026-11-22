import { useContext } from 'react'
import type {
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  ReactElement,
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
  Collection,
  TableLoadMoreItem as AriaTableLoadMoreItem,
  TableStateContext,
  useTableOptions,
  type CellProps,
  type ColumnProps,
  type RowProps,
  type TableHeaderProps,
  type TableProps,
} from 'react-aria-components'
import { cn } from '../cn'
import { Icon } from '../Icon'
import { NoFadeInside, Show } from '../views/Show'
import { Checkbox } from './Checkbox'

export {
  Collection as RowCollection,
  type Key,
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

/** Width of the checkbox column, when rows can be selected. */
export const SELECTION_WIDTH = 40

/**
 * The pinned row of column titles, with the rule under it. When the table selects
 * several rows, it starts with the checkbox that selects them all.
 *
 * The checkbox column is in the JSX only when selection is on: a wrapper (Show)
 * would hide it from React Aria's collection, which reads its children.
 */
export function TableHeader<T extends object>({
  className,
  columns,
  children,
  ...props
}: Omit<TableHeaderProps<T>, 'className' | 'children'> & {
  className?: string
  children: (column: T) => ReactElement
}) {
  const { selectionBehavior, selectionMode } = useTableOptions()
  return (
    <AriaTableHeader
      {...props}
      className={cn(
        // The virtualizer places the titles absolutely: the header takes the heading's
        // height (layoutOptions.headingHeight), so its background and rule have room.
        'sticky top-0 z-10 h-[32px] bg-background shadow-[inset_0_-1px_0_var(--foreground)]',
        className,
      )}
    >
      {selectionBehavior === 'toggle' && (
        <AriaColumn
          width={SELECTION_WIDTH}
          minWidth={SELECTION_WIDTH}
          className="flex h-8 items-center px-3 outline-none"
        >
          {selectionMode === 'multiple' && <Checkbox slot="selection" />}
        </AriaColumn>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaTableHeader>
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
        'group/column relative flex h-8 items-center px-3 text-start text-xs font-normal text-muted outline-none data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-foreground',
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

/**
 * A record's row: a pointer when it opens the record, marked when `current`, shaded
 * when selected. When the table selects rows, it starts with its checkbox.
 */
export function Row<T extends object>({
  current = false,
  className,
  columns,
  children,
  ...props
}: Omit<RowProps<T>, 'className' | 'children'> & {
  current?: boolean
  className?: string
  children: (column: T) => ReactElement
}) {
  const { selectionBehavior } = useTableOptions()
  return (
    <AriaRow
      {...props}
      data-current={current || undefined}
      aria-current={current || undefined}
      className={cn(
        // The virtualizer puts the row in a box of its height: it fills it, so its
        // background (open, selected, hovered) shows.
        'group h-full border-b border-border outline-none data-[focus-visible]:bg-default data-[href]:cursor-pointer data-[selected]:bg-default',
        props.onAction &&
          'cursor-pointer data-[hovered]:bg-[color-mix(in_srgb,var(--default)_50%,transparent)]',
        current && 'bg-default shadow-[inset_3px_0_0_var(--foreground)]',
        className,
      )}
    >
      {selectionBehavior === 'toggle' && (
        <AriaCell className="flex h-full items-center px-3 outline-none">
          <Checkbox slot="selection" />
        </AriaCell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
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
      className="min-w-0 flex-1 truncate"
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

/**
 * A cell: its content centered in the row's height and kept on one line; fields in
 * it keep their keys (above). The virtualizer puts each cell in a box of the row's
 * height, so the cell fills that box and centers with flex (`align-middle` only works
 * in real table cells).
 */
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
        'flex h-full items-center overflow-hidden px-3 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-foreground',
        className,
      )}
    >
      <CellContent>
        <NoFadeInside value={true}>{children}</NoFadeInside>
      </CellContent>
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
