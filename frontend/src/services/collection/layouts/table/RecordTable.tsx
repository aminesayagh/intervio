import { ChevronRight } from 'lucide-react'
import { memo, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cell,
  Column,
  Row,
  RowCollection,
  Show,
  Table,
  TableBody,
  TableHeader,
  TableLayout,
  TableLoadMoreItem,
  Virtualizer,
} from '../../../ui-kit'
import type { CollectionDefinition, ColumnDefinition } from '../../definition'
import { COLUMN_WIDTH, ROW_HEIGHT } from '../../layout/layout'
import { nextSort } from '../../listing/rules'
import { isShared, SharedNote } from '../../selection/sharedEdit'
import type { Id, ReportInvalid, SaveChange } from '../../types'
import { Awake, useHandFocus } from '../../values/awake'
import { ValueField } from '../../values/ValueField'
import type { LayoutProps } from '../contract'
import { MarksProvider, useMark, useMarks } from '../rowMarks'

/**
 * The table (spec 8): React Aria's Table, virtualized (only the rows in view are in
 * the page), with the next page loaded near the end. A row opens its record
 * (`onRowAction`); a sortable header sorts through the address; the columns are the
 * ones that fit, by priority.
 */
export const RecordTable = memo(RecordTableOf) as typeof RecordTableOf

/**
 * Rendered again only when its own props change: opening, switching or closing a
 * record reaches the rows through the store, so the table, and React Aria's state
 * every cell listens to, stay as they are.
 */
function RecordTableOf<T, C>({
  definition,
  items,
  label,
  scrollRef,
  more,
  sort,
  onSort,
  save,
  report,
  canEdit,
  onOpen,
  selection,
  store,
}: LayoutProps<T, C>) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  // Every column, at its own width: the table scrolls sideways when they don't fit,
  // and the panel opening or closing changes nothing in it (spec 9).
  const { columns } = definition
  /** The pointer or the focus reached a row: its cells mount their editors. */
  function wakeRow(event: { target: EventTarget }) {
    const row = (event.target as Element).closest?.('[role="row"][data-key]')
    const id = row?.getAttribute('data-key')
    if (id) store.wake(id)
  }

  /**
   * Three presses on a header: its first direction, then reversed, then back to the
   * collection's default order (which removes the sort from the address).
   */
  function sortBy(id: string) {
    const column = definition.columns.find((c) => c.id === id)
    if (column) onSort(nextSort(sort, id, column.sort ?? 'asc'))
  }

  return (
    <MarksProvider value={store}>
      <div className="contents" onPointerOver={wakeRow} onFocus={wakeRow}>
        <Virtualizer
          layout={TableLayout}
          layoutOptions={{
            rowHeight: ROW_HEIGHT.table,
            headingHeight: 32,
            loaderHeight: ROW_HEIGHT.table,
          }}
        >
          <Table
            ref={scrollRef}
            aria-label={label}
            sortDescriptor={
              sort[0]
                ? {
                    column: sort[0].by,
                    direction:
                      sort[0].direction === 'asc' ? 'ascending' : 'descending',
                  }
                : undefined
            }
            onSortChange={(descriptor) => sortBy(String(descriptor.column))}
            onRowAction={onOpen ? (key) => onOpen(String(key)) : undefined}
            selectionMode={selection ? 'multiple' : 'none'}
            selectedKeys={selection?.keys}
            // "All" is the rows loaded now: those loaded later are not added (spec 8.5).
            onSelectionChange={(keys) =>
              selection?.onChange(
                new Set(
                  keys === 'all'
                    ? items.map(definition.getId)
                    : [...keys].map(String),
                ),
              )
            }
          >
            <TableHeader columns={columns}>
              {(column) => (
                <Column
                  id={column.id}
                  isRowHeader={column.id === columns[0]?.id}
                  allowsSorting={Boolean(column.sort)}
                  width={column.width ?? COLUMN_WIDTH}
                >
                  {t(column.label)}
                </Column>
              )}
            </TableHeader>
            <TableBody>
              <RowCollection
                items={items}
                // React Aria keeps the rows it built: what they show besides the record.
                // (The open row and the selection are read from the store instead.)
                dependencies={[columns, canEdit, save, report, onOpen]}
              >
                {(record) => {
                  const id = definition.getId(record)
                  return (
                    <MarkedRow
                      id={id}
                      // Names the row (and its checkbox, "Select Item 001").
                      textValue={definition.panel?.title(record) ?? id}
                      columns={columns}
                      onAction={onOpen ? () => onOpen(id) : undefined}
                    >
                      {(column) => (
                        <Cell>
                          <Show
                            as="span"
                            className="block min-w-0 truncate"
                            when={column.id === columns[0]?.id && onOpen}
                            fallback={
                              <CellValue
                                definition={definition}
                                column={column}
                                record={record}
                                save={save}
                                report={report}
                                canEdit={canEdit}
                              />
                            }
                          >
                            {(openRecord) => (
                              <span className="flex items-center gap-2">
                                <span className="min-w-0 flex-1">
                                  <CellValue
                                    definition={definition}
                                    column={column}
                                    record={record}
                                    save={save}
                                    report={report}
                                    canEdit={canEdit}
                                  />
                                </span>
                                {/* Shown on the row under the pointer or the focus: opens the record. */}
                                <button
                                  type="button"
                                  aria-label={t('collection:panel.openRecord', {
                                    name: definition.panel?.title(record) ?? '',
                                  })}
                                  onClick={() => openRecord(id)}
                                  className="-my-1 flex shrink-0 cursor-pointer items-center rounded-[var(--field-radius)] bg-default p-1.5 text-muted opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-foreground"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </span>
                            )}
                          </Show>
                        </Cell>
                      )}
                    </MarkedRow>
                  )
                }}
              </RowCollection>
              {/* Always here (a wrapper would hide it from React Aria's collection); it
              asks for a page only when there is one to load. */}
              <TableLoadMoreItem
                onLoadMore={() => more.canLoadMore && more.loadMore()}
                isLoading={more.loading}
                label={t('collection:loading')}
              />
            </TableBody>
          </Table>
        </Virtualizer>
      </div>
    </MarksProvider>
  )
}

/** A record's row, marked while its record is open (read from the store). */
function MarkedRow<T extends object>(
  props: Omit<ComponentProps<typeof Row<T>>, 'current'> & { id: Id },
) {
  const current = useMark((marks) => marks.openId === props.id)
  // Its selection checkbox is built when the row is reached, or once it is selected.
  const asleep = useMark(
    (marks, store) => !store.isAwake(props.id) && !marks.selected.has(props.id),
  )
  const number = useMark((marks) => marks.positions.get(props.id) ?? null)
  return (
    <Row
      {...props}
      current={current}
      selectionAsleep={asleep}
      number={number}
    />
  )
}

type SaveShared<T> = (
  column: ColumnDefinition<T>,
  record: T,
  patch: Partial<T>,
  label: string,
) => Promise<void>

/** One value in its cell: its field when the person may change it, else its display. */
function CellValueOf<T, C>({
  definition,
  column,
  record,
  save,
  report,
  canEdit,
}: {
  definition: CollectionDefinition<T, C>
  column: ColumnDefinition<T>
  record: T
  save: SaveChange<T>
  report: ReportInvalid<T>
  canEdit: (record: T, id: string) => boolean
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const label = t(column.label)
  const id = definition.getId(record)
  const shareable = isShared(column)
  // A shared value of a selected row, with others selected: its note, and it changes them all.
  const note = useMark((marks) =>
    shareable && marks.selected.size > 1 && marks.selected.has(id)
      ? marks.note
      : null,
  )
  const marks = useMarks()
  const awake = useMark((_, store) => store.isAwake(id))
  // Woken by the focus on its text: the focus goes on to the editor.
  const { boxRef, onFocusCapture } = useHandFocus<HTMLSpanElement>(awake)
  return (
    <span ref={boxRef} className="contents" onFocusCapture={onFocusCapture}>
      <Awake value={awake}>
        <SharedNote value={note}>
          <ValueField
            record={record}
            field={column.field}
            allowed={canEdit(record, column.id)}
            read={column.cell}
            label={t(column.label)}
            namespace={definition.i18n.namespace}
            save={(patch) => {
              // The latest selection, at the moment of the change.
              const saveShared = marks.get().saveShared as
                SaveShared<T> | undefined
              return note !== null && saveShared
                ? saveShared(column, record, patch, label)
                : save(record, patch, { label })
            }}
            onInvalid={(reason) => report(record, label, reason)}
            look="cell"
          />
        </SharedNote>
      </Awake>
    </span>
  )
}

/** Rendered again only when its own props change, not with its row. */
const CellValue = memo(CellValueOf) as typeof CellValueOf
