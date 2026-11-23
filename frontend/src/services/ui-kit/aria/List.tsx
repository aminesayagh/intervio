import type { ReactNode, Ref } from 'react'
import {
  GridList,
  GridListItem,
  GridListLoadMoreItem,
  ListLayout,
  Virtualizer,
  type GridListProps,
} from 'react-aria-components'
import { cn } from '../cn'

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
          'scroll-quiet min-h-0 w-full flex-1 overflow-auto outline-none',
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
