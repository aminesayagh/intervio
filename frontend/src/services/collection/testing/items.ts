import { memorySource } from '../memorySource'

/** The test collection's record (spec 15.2): one of each property kind the wrapper must handle. */
export type Item = {
  id: string
  name: string
  status: 'draft' | 'valid' | 'outdated'
  owner: string
  quantity: number | null // null: the property doesn't apply
  description: string // Markdown
  linkedTo: string[] // ids of other items (for drilling down)
  updatedAt: string // ISO date
}

export const STATUSES: Item['status'][] = ['draft', 'valid', 'outdated']
export const OWNERS = [
  'Julie Moreau',
  'Karim Benali',
  'Sophie Martin',
  'Omar Haddad',
]

/** n items with stable ids and names (Item 001…), so tests never depend on randomness. */
export function makeItems(n: number): Item[] {
  return Array.from({ length: n }, (_, index) => {
    const number = String(index + 1).padStart(3, '0')
    return {
      id: `00000000-0000-7000-8000-${String(index + 1).padStart(12, '0')}`,
      name: `Item ${number}`,
      status: STATUSES[index % STATUSES.length],
      owner: OWNERS[index % OWNERS.length],
      quantity: index % 4 === 0 ? null : (index % 9) + 1,
      description: `## Item ${number}\n\nA test item.`,
      linkedTo: index > 0 ? [makeId(1)] : [],
      // One day apart, newest first, from a fixed date.
      updatedAt: new Date(
        Date.UTC(2026, 10, 21) - index * 86_400_000,
      ).toISOString(),
    }
  })
}

function makeId(n: number) {
  return `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`
}

/** The in-memory backend of the test collection. */
export function itemSource(items = makeItems(300)) {
  return memorySource(items, {
    searchText: (item) => `${item.name} ${item.description}`,
    filterValue: (item, filterId) =>
      filterId === 'status'
        ? item.status
        : filterId === 'owner'
          ? item.owner
          : filterId === 'linkedTo'
            ? item.linkedTo
            : undefined,
    sortValue: (item, by) =>
      by === 'name'
        ? item.name
        : by === 'status'
          ? item.status
          : by === 'quantity'
            ? // No quantity sorts after every quantity, smallest first.
              (item.quantity ?? Number.MAX_SAFE_INTEGER)
            : item.updatedAt,
  })
}
