import { addTranslations } from '../../i18n'
import { memorySource } from '../data/memorySource'
import type {
  AnyCollection,
  CollectionDefinition,
  NumberField,
  SelectField,
  TextField,
} from '../definition'
import { KindText, PartChip } from './ItemParts'
import en from './parts-locales/en.json'
import fr from './parts-locales/fr.json'

addTranslations('test-parts', { en, fr })

/**
 * A second test collection, linked to the items (spec 12.1): each part belongs to one
 * item, so an item's panel lists its parts, and "Show all" drills into them.
 */
export type Part = {
  id: string
  name: string
  kind: 'seal' | 'bearing' | 'filter'
  quantity: number | null
  /** The id of the item it belongs to. */
  item: string
  updatedAt: string
}

const KINDS: Part['kind'][] = ['seal', 'bearing', 'filter']

/** An item's id, as makeItems builds it. */
const itemId = (n: number) =>
  `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`

/**
 * Parts for n items, with stable ids: Item 001, 004, 007… have 7 parts (more than a
 * section shows), the others 2.
 */
export function makeParts(items: number): Part[] {
  const parts: Part[] = []
  for (let n = 1; n <= items; n++) {
    const count = n % 3 === 1 ? 7 : 2
    for (let k = 1; k <= count; k++) {
      const kind = KINDS[(n + k) % KINDS.length]
      parts.push({
        id: `00000000-0000-7000-9000-${String(parts.length + 1).padStart(12, '0')}`,
        name: `${kind[0].toUpperCase()}${kind.slice(1)} ${k}, Item ${String(n).padStart(3, '0')}`,
        kind,
        quantity: k,
        item: itemId(n),
        updatedAt: new Date(
          Date.UTC(2026, 10, 21) - parts.length * 3_600_000,
        ).toISOString(),
      })
    }
  }
  return parts
}

export function partSource(parts = makeParts(300)) {
  return memorySource(parts, {
    searchText: (part) => part.name,
    filterValue: (part, filterId) =>
      filterId === 'item'
        ? part.item
        : filterId === 'kind'
          ? part.kind
          : undefined,
    sortValue: (part, by) =>
      by === 'name'
        ? part.name
        : by === 'quantity'
          ? (part.quantity ?? Number.MAX_SAFE_INTEGER)
          : part.updatedAt,
  })
}

const name: TextField<Part> = {
  type: 'text',
  value: (part) => part.name,
  validate: (text) => (text ? undefined : 'errors.nameRequired'),
  patch: (name) => ({ name }),
}
const kind: SelectField<Part> = {
  type: 'select',
  options: KINDS.map((kind) => ({ id: kind, label: `kinds.${kind}` })),
  value: (part) => part.kind,
  patch: (kind) => ({ kind: kind as Part['kind'] }),
}
const quantity: NumberField<Part> = {
  type: 'number',
  value: (part) => part.quantity,
  patch: (quantity) => ({ quantity }),
  min: 1,
}

/** "Item 001", from the item's id. */
const itemName = (part: Part) => `Item ${part.item.slice(-3)}`

/** The parts collection; `items` is the collection its parts belong to. */
export function partDefinition(
  source = partSource(),
  items: () => AnyCollection,
  { key = 'test-parts', basePath }: { key?: string; basePath?: string } = {},
): CollectionDefinition<Part> {
  return {
    key,
    basePath,
    // A bearing stands for a record people work inside (screen 51): reached from an
    // item's panel, it opens its own page.
    opensAsPage: (part) =>
      basePath && part.kind === 'bearing' ? `${basePath}/${part.id}` : null,
    i18n: {
      namespace: 'test-parts',
      title: 'title',
      count: 'count',
      empty: { title: 'empty.title', text: 'empty.text' },
    },
    getId: (part) => part.id,
    source,
    defaultSort: { by: 'updated', direction: 'desc' },
    scopes: [
      {
        id: 'item',
        label: 'scopes.item',
        parent: items,
        patch: (id) => ({ item: id }),
      },
    ],
    filters: [
      {
        id: 'kind',
        label: 'columns.kind',
        options: KINDS.map((kind) => ({ id: kind, label: `kinds.${kind}` })),
        patch: (kind) => ({ kind }),
      },
    ],
    create: {
      add: 'create.add',
      defaults: () => ({
        name: '',
        kind: 'seal',
        quantity: null,
        item: '',
        updatedAt: new Date().toISOString(),
      }),
      ready: (draft) => Boolean(draft.name?.trim()),
    },
    // Narrow screens: its item under the name, its kind on the right.
    row: { detail: itemName, status: (part) => <KindText part={part} /> },
    columns: [
      {
        id: 'name',
        label: 'columns.name',
        sort: 'asc',
        cell: (part) => part.name,
        field: name,
      },
      {
        id: 'kind',
        label: 'columns.kind',
        width: 140,
        cell: (part) => <KindText part={part} />,
        field: kind,
      },
      {
        id: 'quantity',
        label: 'columns.quantity',
        width: 110,
        sort: 'asc',
        cell: (part) => part.quantity ?? <span className="text-muted">—</span>,
        field: quantity,
      },
      {
        id: 'item',
        label: 'columns.item',
        width: 140,
        cell: itemName,
      },
    ],
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
    ],
    panel: {
      type: () => <PartChip />,
      title: (part) => part.name,
      titleEdit: name,
      properties: [
        {
          id: 'kind',
          label: 'columns.kind',
          value: (part) => <KindText part={part} />,
          field: kind,
        },
        {
          id: 'quantity',
          label: 'columns.quantity',
          value: (part) => part.quantity ?? '—',
          field: quantity,
        },
        { id: 'item', label: 'columns.item', value: itemName },
      ],
    },
  }
}
