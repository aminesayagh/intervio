import { Button } from './parts'
import {
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { addTranslations } from '../i18n'
import { Icon } from '../ui-kit'
import { ChoiceCell } from './ChoiceCell'
import { cache, useCollectionQuery } from './collectionQuery'
import { EditableCell } from './EditableCell'
import type { CollectionDefinition, ColumnDefinition } from './definition'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { Toolbar } from './Toolbar'
import type { ListQuery } from './types'
import { useCollectionList } from './useCollectionList'
import { isNarrowed, useCollectionState } from './useCollectionState'

addTranslations('collection', { en, fr })

/** What the list parts need from the query to load more (spec 8.1). */
type More = {
  canLoadMore: boolean
  loadMore: () => void
}

/**
 * A collection screen (spec 4–5): the list of one kind of record, as a table (other
 * views come later).
 * It knows nothing about the records; the definition says how to fetch and show them.
 * It fills the screen's height, and only its list scrolls (spec 8.1).
 */
export function Collection<T extends RowData, C = void>({
  definition,
  context,
}: {
  definition: CollectionDefinition<T, C>
  context?: C
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const scrollRef = useRef<HTMLDivElement>(null)
  const state = useCollectionState(definition.key, definition.defaultSort)
  const { listing } = state
  const narrowed = isNarrowed(listing)
  const list = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context: context as C,
    listing: state.query,
  })
  // Saves a change made in place, then shows the saved record everywhere (spec 8.3).
  const queryClient = useQueryClient()
  const { source, getId, key } = definition
  const save = useCallback(
    async (record: T, patch: Partial<T>) => {
      if (!source.update) throw new Error(`${key} cannot be edited`)
      const updated = await source.update(getId(record), patch, context as C)
      cache.updated(queryClient, key, updated, getId)
    },
    [source, getId, key, context, queryClient],
  )
  const { fetchNextPage } = list
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage])
  const more: More = {
    canLoadMore:
      list.hasNextPage &&
      !list.isFetchingNextPage &&
      !list.isFetchNextPageError,
    loadMore,
  }

  // "12 of 42 items" needs the collection's whole total: one small cached request.
  const all = useQuery({
    queryKey: [definition.key, 'total', context ?? null],
    queryFn: async () =>
      (
        await definition.source.list(
          {
            search: '',
            filters: {},
            sort: definition.defaultSort,
            cursor: null,
          },
          context as C,
        )
      ).total,
    enabled: narrowed,
  })

  const count =
    list.total === undefined
      ? t('collection:countUnknown', { count: list.items.length })
      : narrowed && all.data !== undefined
        ? t('collection:narrowedCount', {
            shown: list.total,
            all: t(definition.i18n.count, { count: all.data }),
          })
        : t(definition.i18n.count, { count: list.total })

  return (
    <section
      aria-labelledby={`${definition.key}-title`}
      className="flex h-[calc(100dvh-5.5rem)] min-h-[360px] flex-col gap-4 lg:h-[calc(100dvh-3rem)]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 id={`${definition.key}-title`} className="text-xl font-medium">
          {t(definition.i18n.title)}
        </h1>
        <span aria-live="polite" className="text-muted">
          {list.data ? count : null}
        </span>
      </div>

      {(narrowed || list.items.length > 0) && (
        <Toolbar
          namespace={definition.i18n.namespace}
          filters={definition.filters ?? []}
          listing={listing}
          onSearch={state.setSearch}
          onFilter={state.setFilter}
          onClear={state.clear}
        />
      )}

      <div
        ref={scrollRef}
        className="scroll-quiet min-h-0 flex-1 overflow-y-auto [--scroll-quiet-top:2rem]"
      >
        {list.isPending ? (
          <Placeholders />
        ) : list.isError && !list.data ? (
          <div role="alert" className="flex flex-col items-start gap-2 py-8">
            <p>{t('collection:error.list')}</p>
            <Button look="secondary" onPress={() => list.refetch()}>
              {t('collection:error.retry')}
            </Button>
          </div>
        ) : list.items.length === 0 && narrowed ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <h2 className="text-lg font-medium">
              {t('collection:noResults.title')}
            </h2>
            <Button look="secondary" onPress={state.clear}>
              {t('collection:noResults.clear')}
            </Button>
          </div>
        ) : list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <h2 className="text-lg font-medium">
              {t(definition.i18n.empty.title)}
            </h2>
            <p className="text-muted">{t(definition.i18n.empty.text)}</p>
          </div>
        ) : (
          <>
            <RecordTable
              definition={definition}
              items={list.items}
              total={list.total}
              label={t(definition.i18n.title)}
              scrollRef={scrollRef}
              more={more}
              sort={listing.sort}
              onSort={state.setSort}
              save={save}
            />
            {list.isFetchingNextPage && <Placeholders rows={2} />}
            {list.isFetchNextPageError && !list.isFetchingNextPage && (
              <div
                role="alert"
                className="flex items-center gap-3 border-b border-border px-3 py-3"
              >
                <span>{t('collection:error.more')}</span>
                <Button size="sm" look="secondary" onPress={loadMore}>
                  {t('collection:error.retry')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

/**
 * The table's features: none. Sorting is done by the server from the address, so the
 * headers change the address directly; column visibility comes in step 11.
 */
const features = tableFeatures({})

/**
 * The table, on TanStack Table's model. Only the drawn rows are in the page; an empty
 * row above and below them keeps the table's real height, so it stays a real table.
 */
function RecordTable<T extends RowData, C>({
  definition,
  items,
  total,
  label,
  scrollRef,
  more,
  sort,
  onSort,
  save,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
  total: number | undefined
  label: string
  scrollRef: RefObject<HTMLDivElement | null>
  more: More
  /** The sort chosen, or null for the default order (no header marked). */
  sort: ListQuery['sort'] | null
  onSort: (sort: ListQuery['sort'] | null) => void
  save: (record: T, patch: Partial<T>) => Promise<void>
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const columns = useMemo<ColumnDef<typeof features, T>[]>(
    () =>
      definition.columns.map((column: ColumnDefinition<T>) => ({
        id: column.id,
        header: () => t(column.label),
        cell: (info) =>
          column.edit ? (
            <EditableCell
              record={info.row.original}
              edit={column.edit}
              label={t(column.label)}
              namespace={definition.i18n.namespace}
              save={(patch) => save(info.row.original, patch)}
            />
          ) : column.choose ? (
            <ChoiceCell
              record={info.row.original}
              choose={column.choose}
              render={column.cell}
              label={t(column.label)}
              namespace={definition.i18n.namespace}
              save={(patch) => save(info.row.original, patch)}
            />
          ) : (
            column.cell(info.row.original)
          ),
      })),
    [definition.columns, definition.i18n.namespace, t, save],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (record) => definition.getId(record),
  })
  const rows = table.getRowModel().rows
  const virtualizer = useCollectionList({
    scrollRef,
    count: rows.length,
    estimateSize: 49,
    ...more,
  })
  const drawn = virtualizer.getVirtualItems()
  const before = drawn[0]?.start ?? 0
  const after = drawn.length
    ? virtualizer.getTotalSize() - drawn[drawn.length - 1].end
    : 0
  const byId = new Map(definition.columns.map((column) => [column.id, column]))

  /**
   * Three clicks on a header: its first direction, then reversed, then back to the
   * collection's default order (which removes the sort from the address).
   */
  function sortBy(column: ColumnDefinition<T>) {
    const first = column.sort ?? 'asc'
    if (sort?.by !== column.id) onSort({ by: column.id, direction: first })
    else if (sort.direction === first)
      onSort({ by: column.id, direction: first === 'asc' ? 'desc' : 'asc' })
    else onSort(null)
  }

  return (
    <table
      aria-label={label}
      aria-rowcount={(total ?? items.length) + 1}
      className="w-full table-fixed border-collapse text-start"
    >
      <thead className="sticky top-0 z-10 bg-background">
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id} aria-rowindex={1}>
            {group.headers.map((header) => {
              const column = byId.get(header.column.id)!
              const sorted = sort?.by === column.id ? sort.direction : null
              return (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={
                    sorted === 'asc'
                      ? 'ascending'
                      : sorted === 'desc'
                        ? 'descending'
                        : column.sort
                          ? 'none'
                          : undefined
                  }
                  style={{ width: column.width }}
                  className="h-8 px-3 text-start align-middle text-xs font-normal text-muted shadow-[inset_0_-1px_0_var(--foreground)]"
                >
                  {header.isPlaceholder ? null : column.sort ? (
                    <button
                      type="button"
                      aria-label={t('collection:sortBy', {
                        column: t(column.label),
                      })}
                      onClick={() => sortBy(column)}
                      className={`-mx-1 flex items-center gap-1 rounded-[var(--field-radius)] px-1 hover:text-foreground ${
                        sorted ? 'text-foreground' : ''
                      }`}
                    >
                      <table.FlexRender header={header} />
                      <Icon
                        name={
                          sorted === 'asc'
                            ? 'Arrow - Top-2'
                            : sorted === 'desc'
                              ? 'Arrow - Bottom-2'
                              : 'Sort'
                        }
                        size={12}
                      />
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              )
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {before > 0 && (
          <tr aria-hidden style={{ height: before }}>
            <td colSpan={columns.length} />
          </tr>
        )}
        {drawn.map((virtual) => {
          const row = rows[virtual.index]
          return (
            <tr
              key={row.id}
              data-index={virtual.index}
              ref={virtualizer.measureElement}
              aria-rowindex={virtual.index + 2}
              className="border-b border-border"
            >
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="truncate px-3 py-3 align-middle">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          )
        })}
        {after > 0 && (
          <tr aria-hidden style={{ height: after }}>
            <td colSpan={columns.length} />
          </tr>
        )}
      </tbody>
    </table>
  )
}

/** Grey rows where records will be: six on the first load, two while more load. */
function Placeholders({ rows = 6 }: { rows?: number }) {
  const { t } = useTranslation('collection')
  const bar = 'rounded-[var(--field-radius)] bg-default'
  return (
    <div role="status" aria-label={t('loading')} className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-3 py-4"
        >
          <span className={`${bar} h-4 w-48`} />
          <span className={`${bar} h-4 w-20`} />
          <span className={`${bar} h-4 w-28`} />
        </div>
      ))}
    </div>
  )
}
