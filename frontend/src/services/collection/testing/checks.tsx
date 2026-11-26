import { ApiError } from '../../http'
import { addTranslations } from '../../i18n'
import { memorySource } from '../data/memorySource'
import type { CollectionDefinition, TextField } from '..'
import type { DataSource } from '..'
import { CheckChip } from './ItemParts'

// ponytail: a test collection's few words, inline rather than in locale files.
addTranslations('test-checks', {
  en: {
    title: 'Checks',
    count_one: '{{count}} check',
    count_other: '{{count}} checks',
    empty: { title: 'No checks yet', text: 'Add the first one.' },
    create: { add: '+ Add check' },
    type: 'Check',
    columns: { name: 'Name' },
  },
  fr: {
    title: 'Contrôles',
    count_one: '{{count}} contrôle',
    count_other: '{{count}} contrôles',
    empty: { title: 'Aucun contrôle', text: 'Ajoutez le premier.' },
    create: { add: '+ Ajouter un contrôle' },
    type: 'Contrôle',
    columns: { name: 'Nom' },
  },
})

/**
 * A test collection that lives inside a record (notice 3): an item's checks. Its
 * context is the item; every request is asked within it, and a check is not found
 * outside its own item, so a lost context shows at once.
 */
export type Check = {
  id: string
  name: string
  item: string
  updatedAt: string
}
export type CheckContext = { item: string }

const itemId = (n: number) =>
  `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`

/** Checks for n items, with stable ids: Item 001, 004… have 7 (more than a section shows), the others 3. */
export function makeChecks(items: number): Check[] {
  const checks: Check[] = []
  for (let n = 1; n <= items; n++)
    for (let k = 1; k <= (n % 3 === 1 ? 7 : 3); k++)
      checks.push({
        id: `00000000-0000-7000-a000-${String(checks.length + 1).padStart(12, '0')}`,
        name: `Check ${k}, Item ${String(n).padStart(3, '0')}`,
        item: itemId(n),
        updatedAt: new Date(
          Date.UTC(2026, 10, 21) - checks.length * 3_600_000,
        ).toISOString(),
      })
  return checks
}

/** The checks, asked within an item: `asked` notes each request's context. */
export function checkSource(checks = makeChecks(300)) {
  const base = memorySource(checks, {
    searchText: (check) => check.name,
    filterValue: (check, id) => (id === 'item' ? check.item : undefined),
    sortValue: (check, by) => (by === 'name' ? check.name : check.updatedAt),
  })
  const asked: (CheckContext | undefined)[] = []
  /** Refuses a request without an item, and a check of another item. */
  const within = async (context: CheckContext | undefined, id?: string) => {
    asked.push(context)
    if (!context?.item) throw new ApiError(400, 'ERROR_NO_CONTEXT')
    if (
      id &&
      base.items().find((check) => check.id === id)?.item !== context.item
    )
      throw new ApiError(404, 'ERROR_NOT_FOUND')
  }
  const source: DataSource<Check, CheckContext> = {
    list: async (query, context) => {
      await within(context)
      return base.list({
        ...query,
        filters: { ...query.filters, item: [context.item] },
      })
    },
    one: async (id, context) => {
      await within(context, id)
      return base.one(id)
    },
    create: async (values, context) => {
      await within(context)
      return base.create!({ ...values, item: context.item })
    },
    update: async (id, patch, context) => {
      await within(context, id)
      return base.update!(id, patch)
    },
  }
  return Object.assign(source, {
    settings: base.settings,
    items: base.items,
    asked,
  })
}

const name: TextField<Check> = {
  type: 'text',
  value: (check) => check.name,
  patch: (name) => ({ name }),
}

/** An item's checks; their list lives at {itemsPath}/{item id}/checks. */
export function checkDefinition(
  source = checkSource(),
  { key = 'test-checks', itemsPath = '/items' } = {},
): CollectionDefinition<Check, CheckContext> {
  return {
    key,
    basePath: (context) => `${itemsPath}/${context.item}/checks`,
    i18n: {
      namespace: 'test-checks',
      title: 'title',
      count: 'count',
      empty: { title: 'empty.title', text: 'empty.text' },
    },
    getId: (check) => check.id,
    source,
    defaultSort: { by: 'updated', direction: 'desc' },
    rights: () => ({ edit: ['name', 'title'] }),
    create: {
      add: 'create.add',
      defaults: (context) => ({
        name: '',
        item: context.item,
        updatedAt: new Date().toISOString(),
      }),
      ready: (draft) => Boolean(draft.name?.trim()),
    },
    columns: [
      {
        id: 'name',
        label: 'columns.name',
        sort: 'asc',
        cell: (check) => check.name,
        field: name,
      },
    ],
    panel: {
      type: () => <CheckChip />,
      title: (check) => check.name,
      titleEdit: name,
      properties: [],
    },
  }
}
