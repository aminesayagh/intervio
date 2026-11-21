import { addTranslations } from '../../i18n'
import type { CollectionDefinition } from '../definition'
import type { DataSource } from '../types'
import { Avatar, Day, StatusChip } from './ItemParts'
import { itemSource, OWNERS, STATUSES, type Item } from './items'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('test-items', { en, fr })

/** The test collection's definition (spec 15.2): the wrapper is tested and shown with it. */
export function itemDefinition(
  source: DataSource<Item> = itemSource(),
  key = 'test-items',
): CollectionDefinition<Item> {
  return {
    key,
    i18n: {
      namespace: 'test-items',
      title: 'title',
      count: 'count',
      empty: { title: 'empty.title', text: 'empty.text' },
    },
    getId: (item) => item.id,
    source,
    defaultSort: { by: 'updated', direction: 'desc' },
    filters: [
      {
        id: 'status',
        label: 'columns.status',
        options: STATUSES.map((status) => ({
          id: status,
          label: `status.${status}`,
        })),
      },
      {
        id: 'owner',
        label: 'columns.owner',
        options: OWNERS.map((owner) => ({ id: owner, label: owner })),
      },
    ],
    columns: [
      {
        id: 'name',
        label: 'columns.name',
        sort: 'asc',
        cell: (item) => item.name,
        edit: {
          value: (item) => item.name,
          validate: (text) => (text ? undefined : 'errors.nameRequired'),
          patch: (name) => ({ name }),
        },
      },
      {
        id: 'status',
        label: 'columns.status',
        width: 140,
        sort: 'asc',
        cell: (item) => <StatusChip status={item.status} />,
        choose: {
          options: STATUSES.map((status) => ({
            id: status,
            label: `status.${status}`,
          })),
          value: (item) => item.status,
          patch: (status) => ({ status: status as Item['status'] }),
        },
      },
      {
        id: 'owner',
        label: 'columns.owner',
        width: 200,
        choose: {
          options: OWNERS.map((owner) => ({ id: owner, label: owner })),
          value: (item) => item.owner,
          patch: (owner) => ({ owner }),
        },
        cell: (item) => (
          <span className="flex items-center gap-2">
            <Avatar name={item.owner} />
            <span className="truncate">{item.owner}</span>
          </span>
        ),
      },
      {
        id: 'quantity',
        label: 'columns.quantity',
        width: 110,
        sort: 'asc',
        cell: (item) => item.quantity ?? <span className="text-muted">—</span>,
      },
      {
        id: 'updated',
        label: 'columns.updated',
        width: 140,
        sort: 'desc',
        cell: (item) => <Day iso={item.updatedAt} />,
      },
    ],
  }
}
