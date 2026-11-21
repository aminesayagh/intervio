import { Button } from '@heroui/react'
import {
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addTranslations } from '../i18n'
import { Icon } from '../ui-kit'
import { useCollectionQuery } from './collectionQuery'
import type { CollectionDefinition, ColumnDefinition } from './definition'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('collection', { en, fr })

type View = 'cards' | 'table'

/**
 * A collection screen (spec 4–5): the list of one kind of record, as cards or a table.
 * It knows nothing about the records; the definition says how to fetch and show them.
 */
export function Collection<T extends RowData, C = void>({
  definition,
  context,
}: {
  definition: CollectionDefinition<T, C>
  context?: C
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const [view, setView] = useState<View>('cards') // remembered from step 4
  const listing = useMemo(
    () => ({ search: '', filters: {}, sort: definition.defaultSort }),
    [definition.defaultSort],
  )
  const list = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context: context as C,
    listing,
  })

  const count =
    list.total !== undefined
      ? t(definition.i18n.count, { count: list.total })
      : t('collection:countUnknown', { count: list.items.length })

  return (
    <section
      aria-labelledby={`${definition.key}-title`}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 id={`${definition.key}-title`} className="text-xl font-medium">
          {t(definition.i18n.title)}
        </h1>
        <span aria-live="polite" className="text-muted">
          {list.data ? count : null}
        </span>
        <ViewSwitch view={view} onChange={setView} />
      </div>

      {list.isPending ? (
        <Placeholders view={view} />
      ) : list.isError && !list.data ? (
        <div role="alert" className="flex flex-col items-start gap-2 py-8">
          <p>{t('collection:error.list')}</p>
          <Button variant="secondary" onPress={() => list.refetch()}>
            {t('collection:error.retry')}
          </Button>
        </div>
      ) : list.items.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <h2 className="text-lg font-medium">
            {t(definition.i18n.empty.title)}
          </h2>
          <p className="text-muted">{t(definition.i18n.empty.text)}</p>
        </div>
      ) : view === 'cards' ? (
        <Cards definition={definition} items={list.items} />
      ) : (
        <RecordTable
          definition={definition}
          items={list.items}
          label={t(definition.i18n.title)}
        />
      )}
    </section>
  )
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: View
  onChange: (view: View) => void
}) {
  const { t } = useTranslation('collection')
  return (
    <div
      role="group"
      aria-label={t('view.label')}
      className="ms-auto flex overflow-hidden rounded-[var(--field-radius)] border border-border"
    >
      {(
        [
          ['cards', 'Grid - 2'],
          ['table', 'Table'],
        ] as const
      ).map(([value, icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          aria-label={t(`view.${value}`)}
          title={t(`view.${value}`)}
          onClick={() => onChange(value)}
          className={`flex size-8 items-center justify-center ${
            view === value
              ? 'bg-default text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Icon name={icon} size={16} />
        </button>
      ))}
    </div>
  )
}

function Cards<T, C>({
  definition,
  items,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((record) => {
        const card = definition.card(record)
        return (
          <li
            key={definition.getId(record)}
            className="flex min-w-0 flex-col gap-2 rounded-[var(--field-radius)] border border-border bg-surface p-4"
          >
            {card.type}
            <span className="truncate font-medium">{card.title}</span>
            {card.detail && (
              <span className="truncate text-muted">{card.detail}</span>
            )}
            {(card.status || card.avatar) && (
              <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                {card.status}
                {card.avatar}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The table's features: none yet; sorting and column visibility come in steps 4 and 11. */
const features = tableFeatures({})

function RecordTable<T extends RowData, C>({
  definition,
  items,
  label,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
  label: string
}) {
  const { t } = useTranslation(definition.i18n.namespace)
  const columns = useMemo<ColumnDef<typeof features, T>[]>(
    () =>
      definition.columns.map((column: ColumnDefinition<T>) => ({
        id: column.id,
        header: () => t(column.label),
        cell: (info) => column.cell(info.row.original),
      })),
    [definition.columns, t],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (record) => definition.getId(record),
  })
  const widths = new Map(
    definition.columns.map((column) => [column.id, column.width]),
  )

  return (
    <div className="overflow-x-auto">
      <table
        aria-label={label}
        className="w-full table-fixed border-collapse text-start"
      >
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-foreground">
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  style={{ width: widths.get(header.column.id) }}
                  className="px-3 py-2 text-start text-xs font-normal text-muted"
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border">
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="truncate px-3 py-3 align-middle">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The first load: six grey cards or rows where the records will be. */
function Placeholders({ view }: { view: View }) {
  const { t } = useTranslation('collection')
  const bar = 'rounded-[var(--field-radius)] bg-default'
  return (
    <div role="status" aria-label={t('loading')}>
      {view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-[var(--field-radius)] border border-border p-4"
            >
              <span className={`${bar} h-4 w-16`} />
              <span className={`${bar} h-4 w-40`} />
              <span className={`${bar} h-3 w-24`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {Array.from({ length: 6 }, (_, i) => (
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
      )}
    </div>
  )
}
