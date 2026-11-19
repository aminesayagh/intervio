import { Table, type SortDescriptor } from '@heroui/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { Icon } from '../../ui-kit'
import { formatDay, useInterventions, type InterventionSummary } from './api'
import { StatusChip } from './StatusChip'

type View = 'cards' | 'table'

const VIEW_KEY = 'intervio.interventionsView'

function savedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards' // storage can be blocked; cards are the default
  }
}

/** "All interventions" (decision 93): cards or a table, most recently updated first. */
export function AllInterventionsPage() {
  const { t } = useTranslation('interventions')
  const { data } = useInterventions()
  const [view, setView] = useState<View>(savedView)

  function choose(next: View) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // not remembered; the choice holds until the page is reloaded
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium">{t('all')}</h1>
        <div
          role="group"
          aria-label={t('view.label')}
          className="flex overflow-hidden rounded-[var(--field-radius)] border border-border"
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
              onClick={() => choose(value)}
              className={`flex size-8 items-center justify-center ${
                view === value
                  ? 'bg-default text-foreground'
                  : 'bg-surface text-muted hover:text-foreground'
              }`}
            >
              <Icon name={icon} size={16} />
            </button>
          ))}
        </div>
      </div>
      {data?.length === 0 && <p className="mt-4 text-muted">{t('none')}</p>}
      {data && data.length > 0 && (
        <div className="mt-5">
          {view === 'cards' ? (
            <Cards items={data} />
          ) : (
            <InterventionTable items={data} />
          )}
        </div>
      )}
    </>
  )
}

function Cards({ items }: { items: InterventionSummary[] }) {
  const { t, i18n } = useTranslation('interventions')
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/interventions/${item.id}`}
          className="flex flex-col gap-1 rounded-[var(--field-radius)] border border-border bg-surface p-4 hover:border-foreground/30"
        >
          <StatusChip status={item.status} />
          <span className="mt-1 truncate font-medium">{item.title}</span>
          <span className="mt-2">
            {t('offersDue', {
              date: formatDay(item.offerDeadline, i18n.language),
            })}
          </span>
        </Link>
      ))}
    </div>
  )
}

/** Sortable columns; status sorts Draft before Published, dates by day. */
type SortColumn = 'status' | 'offerDeadline' | 'updatedAt'

function InterventionTable({ items }: { items: InterventionSummary[] }) {
  const { t, i18n } = useTranslation('interventions')
  const updated = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
  })
  const [sort, setSort] = useState<SortDescriptor>({
    column: 'updatedAt',
    direction: 'descending',
  })
  const sorted = useMemo(() => {
    const column = sort.column as SortColumn
    // ISO dates and the two status words both sort correctly as text.
    return [...items].sort(
      (a, b) =>
        a[column].localeCompare(b[column]) *
        (sort.direction === 'descending' ? -1 : 1),
    )
  }, [items, sort])

  const header = (id: SortColumn, label: string) => (
    <Table.Column id={id} allowsSorting>
      {({ sortDirection }) => (
        <Table.SortableColumnHeader sortDirection={sortDirection}>
          {label}
        </Table.SortableColumnHeader>
      )}
    </Table.Column>
  )

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={t('all')}
          className="min-w-[560px]"
          sortDescriptor={sort}
          onSortChange={setSort}
        >
          <Table.Header>
            {header('status', t('status.label'))}
            <Table.Column id="title" isRowHeader>
              {t('form.title')}
            </Table.Column>
            {header('offerDeadline', t('form.offerDeadline'))}
            {header('updatedAt', t('table.updated'))}
          </Table.Header>
          <Table.Body>
            {sorted.map((item) => (
              <Table.Row
                key={item.id}
                id={item.id}
                onAction={() => navigate(`/interventions/${item.id}`)}
                className="cursor-pointer"
              >
                <Table.Cell>
                  <StatusChip status={item.status} />
                </Table.Cell>
                <Table.Cell>
                  <span className="font-medium">{item.title}</span>
                </Table.Cell>
                <Table.Cell>
                  {formatDay(item.offerDeadline, i18n.language)}
                </Table.Cell>
                <Table.Cell>
                  {updated.format(new Date(item.updatedAt))}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
