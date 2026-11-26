import { Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '../../../notifications'
import {
  Button,
  CardDropIndicator,
  CardItem,
  cn,
  CardList,
  isTextDropItem,
  RowCollection,
  RowListLoadMore,
  Show,
  useDragAndDrop,
  type DropItem,
} from '../../../ui-kit'
import { useCollectionQuery } from '../../data/collectionQuery'
import { arrange, moveCards, type Move } from './moveCards'
import type { SelectField } from '../../definition'
import type { ViewProps } from '../viewProps'

type Shared<T, C> = Pick<
  ViewProps<T, C>,
  | 'definition'
  | 'onOpen'
  | 'query'
  | 'context'
  | 'save'
  | 'canEdit'
  | 'onCreate'
>

/**
 * A board (MOH-35): a column per option of the view's `groupBy` select, in the
 * options' order, each with its count. Each column asks for the list's query plus
 * its own value, and loads more as it scrolls; a card shows the record's name and
 * the view's `card` columns, and opens the record. A value the list's filters leave
 * out keeps its column, empty, without asking.
 *
 * On narrow screens (MAS-37) each column is one screen wide and the board snaps
 * from column to column as it is swiped; a card moves through its menu, not by
 * dragging.
 */
export function Kanban<T, C>({
  label,
  scrollRef,
  groupBy,
  card = [],
  narrow = false,
  ...shared
}: Shared<T, C> &
  Pick<ViewProps<T, C>, 'label' | 'scrollRef'> & {
    groupBy: string
    card?: string[]
    narrow?: boolean
  }) {
  const { definition, query } = shared
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const group = definition.columns.find((column) => column.id === groupBy)
  const field = group?.field as SelectField<T> | undefined
  const options = field?.options ?? []
  const chosen = query.filters[groupBy] ?? []
  // The cards moved on this board, kept until its query changes (another view,
  // filter, sort or search), when the lists show the server's order again.
  const at = JSON.stringify(query)
  const [moved, setMoved] = useState({ at, moves: new Map<string, Move<T>>() })
  if (moved.at !== at) setMoved({ at, moves: new Map() })
  const change = (id: string, move: Move<T> | null) =>
    setMoved((current) => {
      const moves = new Map(current.moves)
      moves.delete(id)
      if (move) moves.set(id, move)
      return { ...current, moves }
    })
  return (
    <div
      ref={scrollRef}
      role="group"
      aria-label={label}
      className={cn(
        'flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2',
        narrow && 'snap-x snap-mandatory',
      )}
    >
      {options.map((option) => (
        <Show
          key={option.id}
          className={cn('flex min-h-0', narrow && 'w-full shrink-0 snap-start')}
          when={chosen.length === 0 || chosen.includes(option.id)}
          fallback={
            <Column title={t(option.label)} count={0} narrow={narrow} />
          }
        >
          <LoadedColumn
            {...shared}
            title={t(option.label)}
            value={option.id}
            group={{
              id: groupBy,
              label: t(group?.label ?? groupBy),
              field: field!,
            }}
            query={{
              ...query,
              filters: { ...query.filters, [groupBy]: [option.id] },
            }}
            card={card}
            narrow={narrow}
            moves={moved.moves}
            onMove={change}
            columns={options.map((other) => ({
              id: other.id,
              label: t(other.label),
            }))}
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
  add,
  narrow = false,
  children,
}: {
  title: string
  count: number
  narrow?: boolean
  /** "+": a new record in this column. */
  add?: { label: string; onPress: () => void }
  children?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex shrink-0 flex-col gap-2 rounded-[var(--field-radius)] bg-default/40 p-2',
        narrow ? 'w-full' : 'w-72',
      )}
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
        {title}
        <span className="text-xs font-normal text-muted">{count}</span>
        <Show as="span" className="ms-auto flex" when={add}>
          {(button) => (
            <Button
              size="sm"
              look="ghost"
              className="size-6 min-w-0 px-0"
              aria-label={button.label}
              onPress={button.onPress}
            >
              <Plus size={14} />
            </Button>
          )}
        </Show>
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
  save,
  canEdit,
  onCreate,
  title,
  value,
  group,
  card,
  narrow,
  columns,
  moves,
  onMove,
}: Shared<T, C> & {
  narrow: boolean
  moves: Map<string, Move<T>>
  /** Records a move on the board, or forgets it (null). */
  onMove: (id: string, move: Move<T> | null) => void
  /** Every column, for a card's move menu on narrow screens. */
  columns: { id: string; label: string }[]
  title: string
  /** The grouping field's value this column holds. */
  value: string
  group: { id: string; label: string; field: SelectField<T> }
  card: string[]
}) {
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
  const { cards: items, change } = arrange(
    list.items,
    value,
    moves,
    definition.getId,
    group.field.value,
  )
  // A moved card has arrived in this column's own list: the copy shown meanwhile goes.
  useEffect(() => {
    for (const [id, move] of moves)
      if (
        move.to === value &&
        move.record &&
        list.items.some(
          (record) =>
            definition.getId(record) === id &&
            group.field.value(record) === value,
        )
      )
        onMove(id, { to: move.to, before: move.before })
  }, [moves, list.items, value, definition, group.field, onMove])
  const move = (records: T[], to: string, before: string | null = null) =>
    moveCards(records, to, group, {
      canEdit,
      save,
      place: (record) => {
        const id = definition.getId(record)
        onMove(id, { to, before, record })
        return () => onMove(id, null)
      },
      refuse: (record) =>
        notify({
          tone: 'error',
          text: t('collection:message.forbidden', {
            field: group.label,
            name: name(record),
          }),
        }),
    })
  const drop = async (dropped: DropItem[], before: string | null = null) =>
    move(
      await Promise.all(
        dropped
          .filter(isTextDropItem)
          .map(async (item) => JSON.parse(await item.getText(type)) as T),
      ),
      value,
      before,
    )
  /** The card a drop lands before: the target, or the one after it (null: the end). */
  const next = (key: string) => {
    const index = items.findIndex((record) => definition.getId(record) === key)
    const after = items[index + 1]
    return after ? definition.getId(after) : null
  }
  // Cards carry their record, for this collection's columns only (MAS-36).
  const type = `intervio-record-${definition.key}`
  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: [type],
    // Looked up by key: with the records from React Aria's second argument, no column
    // accepted the drop in the browser.
    getItems: (keys) =>
      items
        .filter((record) => keys.has(definition.getId(record)))
        .map((record) => ({
          [type]: JSON.stringify(record),
          'text/plain': name(record),
        })),
    // Dropped on the column (the end) or between two cards (that place): the card
    // takes the column's value, and stays where it was dropped (arrange).
    onRootDrop: (event) => drop(event.items),
    onInsert: (event) =>
      drop(
        event.items,
        event.target.dropPosition === 'before'
          ? String(event.target.key)
          : next(String(event.target.key)),
      ),
    renderDropIndicator: (target) => <CardDropIndicator target={target} />,
  })
  return (
    <Column
      title={title}
      narrow={narrow}
      count={(list.total ?? list.items.length) + change}
      add={
        onCreate && {
          label: t('collection:board.add', { column: title }),
          onPress: () => onCreate(group.field.patch(value)),
        }
      }
    >
      <CardList
        aria-label={title}
        dragAndDropHooks={narrow ? undefined : dragAndDropHooks}
        className="rounded-[var(--field-radius)] data-[drop-target]:bg-default data-[drop-target]:outline-2 data-[drop-target]:outline-dashed data-[drop-target]:outline-border"
        onAction={onOpen ? (key) => onOpen(String(key)) : undefined}
        renderEmptyState={() => (
          <p className="px-1 py-2 text-xs text-muted">
            {t('collection:board.empty')}
          </p>
        )}
      >
        <RowCollection items={items as object[]}>
          {(item) => {
            const record = item as T
            const movable = canEdit(record, group.id)
            const label = t('collection:board.move', { name: name(record) })
            return (
              <CardItem
                id={definition.getId(record)}
                textValue={name(record)}
                dragLabel={movable && !narrow ? label : undefined}
                arriving={moves.get(definition.getId(record))?.to === value}
                move={
                  movable && narrow
                    ? {
                        label,
                        targets: columns.filter((other) => other.id !== value),
                        onMove: (to) => move([record], to),
                      }
                    : undefined
                }
              >
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
