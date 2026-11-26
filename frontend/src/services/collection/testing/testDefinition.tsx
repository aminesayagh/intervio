import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { addTranslations } from '../../i18n'
import { AvatarImage } from '..'
import { FileCount, FileList } from '..'
import { memorySrc, memoryUpload } from './memoryFiles'
import { firstLine } from '..'
import type {
  AnyCollection,
  AvatarField,
  DateRangeField,
  FileField,
  CheckboxField,
  IconField,
  RichTextField,
  DateField,
  MultiSelectField,
  LinkField,
  CollectionDefinition,
  NumberField,
  SelectField,
  TextField,
} from '..'
import type { DataSource } from '..'
import { Avatar, Day, Period, StatusChip, Tags, TypeChip } from './ItemParts'
import { itemSource, OWNERS, STATUSES, TAGS, type Item } from './items'
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
const link = <K extends 'website' | 'email' | 'phone' | 'location'>(
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
const location = link('location', 'location')
const tags: MultiSelectField<Item> = {
  type: 'multiSelect',
  options: TAGS.map((tag) => ({ id: tag, label: `tags.${tag}` })),
  value: (item) => item.tags,
  patch: (tags) => ({ tags }),
}
const due: DateField<Item> = {
  type: 'date',
  value: (item) => item.due,
  patch: (due) => ({ due }),
}
const dueDay = (item: Item) =>
  item.due ? <Day iso={item.due} /> : <span className="text-muted">—</span>
const notes: RichTextField<Item> = {
  type: 'richText',
  value: (item) => item.notes,
  patch: (notes) => ({ notes }),
}
const notesLine = (item: Item) =>
  firstLine(item.notes) || <span className="text-muted">—</span>
const icon: IconField<Item> = {
  type: 'icon',
  value: (item) => item.icon,
  patch: (icon) => ({ icon }),
}
const iconOf = (item: Item) =>
  item.icon ? (
    <DynamicIcon name={item.icon as IconName} size={16} />
  ) : (
    <span className="text-muted">—</span>
  )
const avatar: AvatarField<Item> = {
  type: 'avatar',
  value: (item) => item.avatar,
  patch: (avatar) => ({ avatar }),
  upload: memoryUpload,
  src: memorySrc,
}
const avatarOf = (item: Item) => (
  <AvatarImage edit={avatar} file={item.avatar} look="cell" />
)
const files: FileField<Item> = {
  type: 'file',
  value: (item) => item.files,
  patch: (files) => ({ files }),
  upload: memoryUpload,
  src: memorySrc,
}
const planned: DateRangeField<Item> = {
  type: 'dateRange',
  value: (item) => item.planned,
  patch: (planned) => ({ planned }),
}
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
  /** The parts collection, when the items link to it (the showcase, drill-down tests). */
  parts?: () => AnyCollection,
  /** Its list's address, which "Show all" opens; defaults to /{key}. */
  basePath?: string,
  /** The checks collection, which lives inside each item (notice 3). */
  checks?: () => AnyCollection,
): CollectionDefinition<Item> {
  const definition: CollectionDefinition<Item> = {
    basePath,
    rights,
    // "Show all" on an item's linked records opens the items that link to it.
    scopes: [
      {
        id: 'linkedTo',
        label: 'scopes.linkedTo',
        parent: () => definition,
        patch: (id) => ({ linkedTo: [id] }),
      },
    ],
    create: {
      add: 'create.add',
      defaults: () => ({
        name: '',
        status: 'draft',
        owner: OWNERS[0],
        quantity: null,
        active: true,
        tags: [],
        due: null,
        planned: null,
        notes: '',
        website: '',
        email: '',
        phone: '',
        location: '',
        icon: null,
        avatar: null,
        files: [],
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
          id: 'tags',
          label: 'columns.tags',
          value: (item) => <Tags tags={item.tags} max={4} />,
          field: tags,
        },
        {
          id: 'due',
          label: 'columns.due',
          value: dueDay,
          field: due,
        },
        {
          id: 'planned',
          label: 'columns.planned',
          value: (item) => <Period range={item.planned} />,
          field: planned,
        },
        {
          id: 'notes',
          label: 'columns.notes',
          value: notesLine,
          field: notes,
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
          id: 'location',
          label: 'columns.location',
          value: (item) => item.location,
          field: location,
        },
        {
          id: 'icon',
          label: 'columns.icon',
          value: iconOf,
          field: icon,
        },
        {
          id: 'avatar',
          label: 'columns.avatar',
          value: (item) => (
            <AvatarImage edit={avatar} file={item.avatar} look="panel" />
          ),
          field: avatar,
        },
        {
          id: 'files',
          label: 'columns.files',
          value: (item) => <FileList files={item.files} src={memorySrc} />,
          field: files,
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
          collection: () => definition,
          scope: (item) => ({ linkedTo: [item.id] }),
        },
        ...(parts
          ? [
              {
                id: 'parts',
                label: 'parts',
                collection: parts,
                scope: (item: Item) => ({ item: [item.id] }),
                // A part linked to this item: its item is this one.
                link: (item: Item) => ({ item: item.id }),
              },
            ]
          : []),
        ...(checks
          ? [
              {
                id: 'checks',
                label: 'checks',
                collection: checks,
                // The context narrows them to this item already.
                scope: () => ({}),
                context: (item: Item) => ({ item: item.id }),
              },
            ]
          : []),
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
    // Narrow screens: the owner and the quantity under the name, the status chip.
    row: {
      detail: (item) =>
        item.quantity === null
          ? item.owner
          : `${item.owner} · ${item.quantity}`,
      status: (item) => <StatusChip status={item.status} />,
    },
    columns: [
      {
        id: 'name',
        label: 'columns.name',
        filter: true,
        width: 260,
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
        id: 'updated',
        label: 'columns.updated',
        width: 140,
        sort: 'desc',
        cell: (item) => <Day iso={item.updatedAt} />,
      },
      {
        id: 'quantity',
        label: 'columns.quantity',
        filter: true,
        width: 110,
        sort: 'asc',
        cell: (item) => item.quantity ?? <span className="text-muted">—</span>,
        field: quantity,
      },
      {
        id: 'active',
        label: 'columns.active',
        filter: true,
        width: 90,
        cell: (item) => (item.active ? 'Yes' : 'No'),
        field: active,
      },
      {
        id: 'tags',
        label: 'columns.tags',
        filter: true,
        width: 220,
        cell: (item) => <Tags tags={item.tags} />,
        field: tags,
      },
      {
        id: 'due',
        label: 'columns.due',
        filter: true,
        width: 150,
        cell: dueDay,
        field: due,
      },
      {
        id: 'planned',
        label: 'columns.planned',
        width: 220,
        cell: (item) => <Period range={item.planned} />,
        field: planned,
      },
      {
        id: 'notes',
        label: 'columns.notes',
        width: 240,
        cell: notesLine,
        field: notes,
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
        id: 'location',
        label: 'columns.location',
        width: 260,
        cell: (item) => item.location,
        field: location,
      },
      {
        id: 'icon',
        label: 'columns.icon',
        width: 80,
        cell: iconOf,
        field: icon,
      },
      {
        id: 'avatar',
        label: 'columns.avatar',
        width: 80,
        cell: avatarOf,
        field: avatar,
      },
      {
        id: 'files',
        label: 'columns.files',
        width: 110,
        cell: (item) => <FileCount files={item.files} />,
        field: files,
      },
    ],
  }
  return definition
}
