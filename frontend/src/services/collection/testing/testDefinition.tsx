import { addTranslations } from '../../i18n'
import type { CollectionDefinition } from '../definition'
import type { DataSource } from '../types'
import { Avatar, Day, StatusChip, TypeChip } from './ItemParts'
import { itemSource, type Item } from './items'
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
    card: (item) => ({
      type: <TypeChip />,
      title: item.name,
      detail: item.owner,
      status: <StatusChip status={item.status} />,
      avatar: <Avatar name={item.owner} />,
    }),
    columns: [
      { id: 'name', label: 'columns.name', cell: (item) => item.name },
      {
        id: 'status',
        label: 'columns.status',
        width: 140,
        cell: (item) => <StatusChip status={item.status} />,
      },
      {
        id: 'owner',
        label: 'columns.owner',
        width: 200,
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
        cell: (item) => item.quantity ?? <span className="text-muted">—</span>,
      },
      {
        id: 'updated',
        label: 'columns.updated',
        width: 140,
        cell: (item) => <Day iso={item.updatedAt} />,
      },
    ],
  }
}
