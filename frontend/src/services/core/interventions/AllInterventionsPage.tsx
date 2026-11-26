import { Table, type SortDescriptor } from '@heroui/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../navigation'
import { Match, Switch } from '../../ui-kit'
import { formatDay, useInterventions, type InterventionSummary } from './api'
import { StatusChip } from './StatusChip'

/** "All interventions" (decision 93): a table, most recently updated first. */
export function AllInterventionsPage() {
  const { t } = useTranslation('interventions')
  const { data } = useInterventions()
  return (
    <>
      <h1 className="text-xl font-medium">{t('all')}</h1>
      <Switch>
        <Match when={data?.length === 0}>
          <p className="mt-4 text-muted">{t('none')}</p>
        </Match>
        <Match when={data?.length ? data : null}>
          {(items) => (
            <div className="mt-5">
              <InterventionTable items={items} />
            </div>
          )}
        </Match>
      </Switch>
    </>
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
