import type { ReactNode, Ref } from 'react'
import { EllipsisVertical, GripVertical } from 'lucide-react'
import {
  Button as AriaButton,
  DropIndicator,
  GridList,
  GridListItem,
  GridListLoadMoreItem,
  ListLayout,
  Virtualizer,
  type DropTarget,
  type GridListProps,
} from 'react-aria-components'
import { cn } from '../cn'
import { Show } from '../views/Show'
import { ActionMenu, MenuPopover, MenuTrigger, type MenuAction } from './Menu'

/**
 * A long list of records as rows (narrow screens, spec 9): React Aria's GridList
 * (arrow keys between rows, Enter opens one), virtualized: only the rows in view are
 * in the page. It scrolls itself.
 */
export function RowList<T extends object>({
  className,
  ref,
  rowHeight,
  ...props
}: Omit<GridListProps<T>, 'className'> & {
  className?: string
  /** The element that scrolls. */
  ref?: Ref<HTMLDivElement>
  /** Each row's height in px (rows are one height, like the table's). */
  rowHeight: number
}) {
  return (
    <Virtualizer layout={ListLayout} layoutOptions={{ rowHeight }}>
      <GridList
        {...props}
        ref={ref}
        className={cn(
          'min-h-0 w-full flex-1 overflow-auto outline-none',
          className,
        )}
      />
    </Virtualizer>
  )
}

/** A row: a pointer when it opens its record, shaded under the pointer or the focus. */
export function RowItem({
  id,
  textValue,
  children,
}: {
  id: string
  /** The row's name, for type-ahead and assistive technologies. */
  textValue: string
  children: ReactNode
}) {
  return (
    <GridListItem
      id={id}
      textValue={textValue}
      className="flex h-full cursor-pointer items-center gap-3 border-b border-border px-1 outline-none data-[focus-visible]:bg-default data-[hovered]:bg-[color-mix(in_srgb,var(--default)_50%,var(--background))]"
    >
      {children}
    </GridListItem>
  )
}

/** The end of the list: loads the next page when it comes near (infinite scroll). */
export function RowListLoadMore({
  onLoadMore,
  isLoading,
  label,
}: {
  onLoadMore: () => void
  isLoading: boolean
  label: string
}) {
  return (
    <GridListLoadMoreItem onLoadMore={onLoadMore} isLoading={isLoading}>
      <div
        role="status"
        aria-label={label}
        className="flex flex-col gap-2 border-b border-border px-1 py-3"
      >
        <span className="h-3 w-40 rounded-[var(--field-radius)] bg-default" />
        <span className="h-3 w-24 rounded-[var(--field-radius)] bg-default" />
      </div>
    </GridListLoadMoreItem>
  )
}

/**
 * A column of cards (a kanban's, MOH-35): React Aria's GridList, virtualized, cards
 * of their own heights with a gap between them. It scrolls itself.
 */
export function CardList<T extends object>({
  className,
  ...props
}: Omit<GridListProps<T>, 'className'> & { className?: string }) {
  return (
    <Virtualizer
      layout={ListLayout}
      // The drop indicator's slot fits its rings (CardDropIndicator).
      layoutOptions={{
        estimatedRowHeight: 64,
        gap: 8,
        padding: 4,
        dropIndicatorThickness: 10,
      }}
    >
      <GridList
        {...props}
        className={cn(
          'min-h-0 w-full flex-1 overflow-auto outline-none',
          className,
        )}
      />
    </Virtualizer>
  )
}

/**
 * Where a dragged card will land between two cards: a line in the primary color,
 * with a ring at each end (React Aria's DropIndicator). Shown only while it is the
 * target; it sits in the gap between cards, so they don't shift as it moves.
 */
export function CardDropIndicator({ target }: { target: DropTarget }) {
  return (
    <DropIndicator
      target={target}
      className="invisible h-full data-[drop-target]:visible"
    >
      <svg
        height={10}
        className="block w-full -translate-y-1 fill-none stroke-[var(--accent)] forced-colors:stroke-[Highlight]"
      >
        <circle cx={5} cy={5} r={4} strokeWidth={2} />
        <line
          x1={18}
          x2="100%"
          y1={5}
          y2={5}
          strokeWidth={2}
          transform="translate(-9 0)"
        />
        <circle
          cx="100%"
          cy={5}
          r={4}
          strokeWidth={2}
          transform="translate(-5 0)"
        />
      </svg>
    </DropIndicator>
  )
}

/**
 * One card: a bordered box that opens its record. With `dragLabel`, a grip on its
 * right moves it with the keyboard (Enter, then Tab to a column, Enter); the
 * pointer drags the whole card.
 */
export function CardItem({
  id,
  textValue,
  dragLabel,
  move,
  arriving = false,
  children,
}: {
  id: string
  textValue: string
  /** Set when the card can be moved: the grip's name ("Move Item 001"). */
  dragLabel?: string
  /** Narrow screens: a menu that moves the card, instead of dragging it. */
  move?: { label: string; targets: MenuAction[]; onMove: (id: string) => void }
  /** Just moved here: it fades in, the same short fade as Show (none with reduced motion). */
  arriving?: boolean
  children: ReactNode
}) {
  return (
    <GridListItem
      id={id}
      textValue={textValue}
      className={cn(
        'group/card relative flex cursor-pointer flex-col gap-1 rounded-[var(--field-radius)] border border-border bg-surface px-3 py-2 outline-none data-[dragging]:opacity-50 data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground data-[hovered]:bg-[color-mix(in_srgb,var(--default)_50%,var(--surface))]',
        arriving &&
          'motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out motion-safe:starting:opacity-0',
      )}
    >
      {children}
      <Show as="span" when={dragLabel !== undefined}>
        <AriaButton
          slot="drag"
          aria-label={dragLabel}
          className="absolute end-1 top-1.5 flex size-6 cursor-grab items-center justify-center rounded-[var(--field-radius)] text-muted opacity-0 outline-none group-data-[focus-visible]/card:opacity-100 group-data-[hovered]/card:opacity-100 data-[focus-visible]:opacity-100 data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground"
        >
          <GripVertical size={14} />
        </AriaButton>
      </Show>
      <Show as="span" when={move}>
        {(menu) => (
          <MenuTrigger>
            <AriaButton
              aria-label={menu.label}
              className="absolute end-1 top-1.5 flex size-8 items-center justify-center rounded-[var(--field-radius)] text-muted outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground"
            >
              <EllipsisVertical size={16} />
            </AriaButton>
            <MenuPopover>
              <ActionMenu
                label={menu.label}
                actions={menu.targets}
                onAction={menu.onMove}
              />
            </MenuPopover>
          </MenuTrigger>
        )}
      </Show>
    </GridListItem>
  )
}
