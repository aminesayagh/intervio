import { useTranslation } from 'react-i18next'
import type { RefObject } from 'react'
import { RowCollection, RowItem, RowList, RowListLoadMore } from '../../ui-kit'
import type { CollectionDefinition } from '../definition'
import type { Id } from '../types'

/** A row's height in px: the name, and the line under it. */
const ROW_HEIGHT = 57

/**
 * The list on narrow screens (spec 9, decision 121): a row per record, with its name,
 * the line under it and its status; a row opens its record (the panel then is the
 * screen). No selection and no editing in place: those stay on wider screens.
 */
export function RecordRows<T, C>({
  definition,
  items,
  label,
  scrollRef,
  more,
  onOpen,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
  label: string
  scrollRef: RefObject<HTMLDivElement | null>
  more: { canLoadMore: boolean; loadMore: () => void; loading: boolean }
  onOpen?: (id: Id) => void
}) {
  const { t } = useTranslation('collection')
  const name = (record: T) =>
    definition.panel?.title(record) ?? definition.getId(record)
  const detail = definition.row?.detail ?? definition.panel?.subtitle
  const status = definition.row?.status
  return (
    <RowList
      ref={scrollRef}
      aria-label={label}
      rowHeight={ROW_HEIGHT}
      // React Aria's keys are strings or numbers; ours are ids (strings).
      onAction={onOpen ? (key) => onOpen(String(key)) : undefined}
    >
      <RowCollection items={items as object[]}>
        {(item) => {
          const record = item as T
          return (
            <RowItem id={definition.getId(record)} textValue={name(record)}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{name(record)}</span>
                <span className="truncate text-xs text-muted">
                  {detail?.(record)}
                </span>
              </span>
              <span className="flex shrink-0">{status?.(record)}</span>
            </RowItem>
          )
        }}
      </RowCollection>
      <RowListLoadMore
        onLoadMore={() => more.canLoadMore && more.loadMore()}
        isLoading={more.loading}
        label={t('loading')}
      />
    </RowList>
  )
}
