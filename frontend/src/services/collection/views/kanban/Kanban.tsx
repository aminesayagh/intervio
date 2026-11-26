import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CardItem,
  CardList,
  RowCollection,
  RowListLoadMore,
  Show,
} from '../../../ui-kit'
import { useCollectionQuery } from '../../data/collectionQuery'
import type { SelectField } from '../../definition'
import type { ViewProps } from '../viewProps'

type Shared<T, C> = Pick<
  ViewProps<T, C>,
  'definition' | 'onOpen' | 'query' | 'context'
>

/**
 * A board (MOH-35): a column per option of the view's `groupBy` select, in the
 * options' order, each with its count. Each column asks for the list's query plus
 * its own value, and loads more as it scrolls; a card shows the record's name and
 * the view's `card` columns, and opens the record. A value the list's filters leave
 * out keeps its column, empty, without asking.
 */
export function Kanban<T, C>({
  label,
  scrollRef,
  groupBy,
  card = [],
  ...shared
}: Shared<T, C> &
  Pick<ViewProps<T, C>, 'label' | 'scrollRef'> & {
    groupBy: string
    card?: string[]
  }) {
  const { definition, query } = shared
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const group = definition.columns.find((column) => column.id === groupBy)
  const options = (group?.field as SelectField<T> | undefined)?.options ?? []
  const chosen = query.filters[groupBy] ?? []
  return (
    <div
      ref={scrollRef}
      role="group"
      aria-label={label}
      className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2"
    >
      {options.map((option) => (
        <Show
          key={option.id}
          className="flex min-h-0"
          when={chosen.length === 0 || chosen.includes(option.id)}
          fallback={<Column title={t(option.label)} count={0} />}
        >
          <LoadedColumn
            {...shared}
            title={t(option.label)}
            query={{
              ...query,
              filters: { ...query.filters, [groupBy]: [option.id] },
            }}
            card={card}
          />
        </Show>
      ))}
    </div>
  )
}

/** A column's frame: its title and count, then its cards. */
function Column({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-[var(--field-radius)] bg-default/40 p-2"
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
        {title}
        <span className="text-xs font-normal text-muted">{count}</span>
      </h2>
      {children}
    </section>
  )
}

function LoadedColumn<T, C>({
  definition,
  onOpen,
  query,
  context,
  title,
  card,
}: Shared<T, C> & { title: string; card: string[] }) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const list = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context,
    listing: query,
  })
  const name = (record: T) =>
    definition.panel?.title(record) ?? definition.getId(record)
  const shown = definition.columns.filter((column) => card.includes(column.id))
  return (
    <Column title={title} count={list.total ?? list.items.length}>
      <CardList
        aria-label={title}
        onAction={onOpen ? (key) => onOpen(String(key)) : undefined}
        renderEmptyState={() => (
          <p className="px-1 py-2 text-xs text-muted">
            {t('collection:board.empty')}
          </p>
        )}
      >
        <RowCollection items={list.items as object[]}>
          {(item) => {
            const record = item as T
            return (
              <CardItem id={definition.getId(record)} textValue={name(record)}>
                <span className="truncate font-medium">{name(record)}</span>
                <Show
                  as="span"
                  when={shown.length > 0}
                  className="flex flex-wrap items-center gap-2 text-xs text-muted"
                >
                  {shown.map((column) => (
                    <span key={column.id} className="flex min-w-0 items-center">
                      {column.cell(record)}
                    </span>
                  ))}
                </Show>
              </CardItem>
            )
          }}
        </RowCollection>
        <RowListLoadMore
          onLoadMore={() =>
            list.hasNextPage &&
            !list.isFetchingNextPage &&
            void list.fetchNextPage()
          }
          isLoading={list.isFetchingNextPage}
          label={t('collection:loading')}
        />
      </CardList>
    </Column>
  )
}
