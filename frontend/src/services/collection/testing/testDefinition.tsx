import { addTranslations } from '../../i18n'
import type {
  CheckboxField,
  LinkField,
  CollectionDefinition,
  NumberField,
  SelectField,
  TextField,
} from '../definition'
import type { DataSource } from '../types'
import { Avatar, Day, StatusChip, TypeChip, UpdatedOn } from './ItemParts'
import { itemSource, OWNERS, STATUSES, type Item } from './items'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('test-items', { en, fr })

/** The fields, shared by the table and the panel (spec 7.3.0). */
const name: TextField<Item> = {
  type: 'text',
  value: (item) => item.name,
  validate: (text) => (text ? undefined : 'errors.nameRequired'),
  patch: (name) => ({ name }),
}
const status: SelectField<Item> = {
  type: 'select',
  options: STATUSES.map((status) => ({
    id: status,
    label: `status.${status}`,
  })),
  value: (item) => item.status,
  patch: (status) => ({ status: status as Item['status'] }),
}
const owner: SelectField<Item> = {
  type: 'select',
  options: OWNERS.map((owner) => ({ id: owner, label: owner })),
  value: (item) => item.owner,
  patch: (owner) => ({ owner }),
}
const active: CheckboxField<Item> = {
  type: 'checkbox',
  value: (item) => item.active,
  patch: (active) => ({ active }),
}
const link = <K extends 'website' | 'email' | 'phone'>(
  key: K,
  type: LinkField<Item>['type'],
): LinkField<Item> => ({
  type,
  value: (item) => item[key],
  patch: (value) => ({ [key]: value }) as Partial<Item>,
})
const website = link('website', 'url')
const email = link('email', 'email')
const phone = link('phone', 'phone')
/** The quantity: a whole number of at least 1, or none. */
const quantity: NumberField<Item> = {
  type: 'number',
  value: (item) => item.quantity,
  patch: (quantity) => ({ quantity }),
  min: 1,
}

/** The test collection's definition (spec 15.2): the wrapper is tested and shown with it. */
export function itemDefinition(
  source: DataSource<Item> = itemSource(),
  key = 'test-items',
  rights?: CollectionDefinition<Item>['rights'],
): CollectionDefinition<Item> {
  return {
    rights,
    create: {
      add: 'create.add',
      defaults: () => ({
        name: '',
        status: 'draft',
        owner: OWNERS[0],
        quantity: null,
        active: true,
        website: '',
        email: '',
        phone: '',
        description: '',
        linkedTo: [],
        updatedAt: new Date().toISOString(),
      }),
      ready: (draft) => Boolean(draft.name?.trim()),
    },
    actions: [
      {
        id: 'archive',
        label: 'actions.archive',
        confirm: {
          title: 'actions.archiveTitle',
          text: 'actions.archiveText',
          button: 'actions.archive',
        },
      },
      {
        id: 'remove',
        label: 'actions.remove',
        confirm: {
          title: 'actions.removeTitle',
          text: 'actions.removeText',
          button: 'actions.remove',
        },
      },
    ],
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
    panel: {
      type: () => <TypeChip />,
      title: (item) => item.name,
      titleEdit: name,
      subtitle: (item) => <UpdatedOn iso={item.updatedAt} />,
      properties: [
        {
          id: 'status',
          label: 'columns.status',
          value: (item) => <StatusChip status={item.status} />,
          field: status,
        },
        {
          id: 'owner',
          label: 'columns.owner',
          value: (item) => (
            <span className="flex items-center gap-2">
              <Avatar name={item.owner} />
              {item.owner}
            </span>
          ),
          field: owner,
        },
        {
          id: 'quantity',
          label: 'columns.quantity',
          value: (item) => item.quantity ?? '—',
          field: quantity,
        },
        {
          id: 'active',
          label: 'columns.active',
          value: (item) => (item.active ? 'Yes' : 'No'),
          field: active,
        },
        {
          id: 'website',
          label: 'columns.website',
          value: (item) => item.website,
          field: website,
        },
        {
          id: 'email',
          label: 'columns.email',
          value: (item) => item.email,
          field: email,
        },
        {
          id: 'phone',
          label: 'columns.phone',
          value: (item) => item.phone,
          field: phone,
        },
        {
          id: 'updated',
          label: 'columns.updated',
          value: (item) => <Day iso={item.updatedAt} />,
        },
      ],
      description: {
        value: (item) => item.description,
        patch: (description) => ({ description }),
      },
      sections: [
        {
          id: 'linked',
          label: 'linked',
          items: (item) =>
            item.linkedTo.map((id) => ({
              id,
              label: `Item ${id.slice(-3)}`,
              kind: <TypeChip />,
            })),
        },
      ],
    },
    filters: [
      {
        id: 'status',
        label: 'columns.status',
        options: STATUSES.map((status) => ({
          id: status,
          label: `status.${status}`,
        })),
        patch: (status) => ({ status }),
      },
      {
        id: 'owner',
        label: 'columns.owner',
        options: OWNERS.map((owner) => ({ id: owner, label: owner })),
        patch: (owner) => ({ owner }),
      },
    ],
    columnPriority: [
      'name',
      'status',
      'updated',
      'owner',
      'quantity',
      'active',
      'website',
      'email',
      'phone',
    ],
    columns: [
      {
        id: 'name',
        label: 'columns.name',
        sort: 'asc',
        cell: (item) => item.name,
        field: name,
      },
      {
        id: 'status',
        label: 'columns.status',
        width: 140,
        sort: 'asc',
        cell: (item) => <StatusChip status={item.status} />,
        field: status,
      },
      {
        id: 'owner',
        label: 'columns.owner',
        width: 200,
        field: owner,
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
        field: quantity,
      },
      {
        id: 'active',
        label: 'columns.active',
        width: 90,
        cell: (item) => (item.active ? 'Yes' : 'No'),
        field: active,
      },
      {
        id: 'website',
        label: 'columns.website',
        width: 220,
        cell: (item) => item.website,
        field: website,
      },
      {
        id: 'email',
        label: 'columns.email',
        width: 220,
        cell: (item) => item.email,
        field: email,
      },
      {
        id: 'phone',
        label: 'columns.phone',
        width: 160,
        cell: (item) => item.phone,
        field: phone,
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
