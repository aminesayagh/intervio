import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, test } from 'vitest'
import { cache, keys, useCollectionQuery } from './collectionQuery'
import { itemSource, makeItems, type Item } from './testing/items'
import type { Page } from './types'

const listing = {
  search: '',
  filters: {},
  sort: { by: 'updated', direction: 'desc' as const },
}
const getId = (item: Item) => item.id

function setup(count = 75) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const source = itemSource(makeItems(count))
  const hook = renderHook(
    () =>
      useCollectionQuery({ key: 'items', source, context: undefined, listing }),
    { wrapper },
  )
  return { client, source, hook }
}

const listKey = keys.list('items', undefined, listing)
const pages = (client: QueryClient) =>
  client.getQueryData<InfiniteData<Page<Item>>>(listKey)!

test('loads the first page, then the next ones, with the total of the first', async () => {
  const { hook } = setup()
  await waitFor(() => expect(hook.result.current.items).toHaveLength(30))
  expect(hook.result.current.total).toBe(75)
  expect(hook.result.current.hasNextPage).toBe(true)

  await act(() => hook.result.current.fetchNextPage())
  await act(() => hook.result.current.fetchNextPage())
  await waitFor(() => expect(hook.result.current.items).toHaveLength(75))
  expect(hook.result.current.hasNextPage).toBe(false)
  expect(new Set(hook.result.current.items.map(getId)).size).toBe(75)
})

test('a created record goes on top of its list and adds 1 to the total', async () => {
  const { client, hook } = setup()
  await waitFor(() => expect(hook.result.current.items).toHaveLength(30))
  const created = { ...makeItems(1)[0], id: 'new', name: 'New item' }
  act(() => cache.created(client, listKey, created))
  await waitFor(() =>
    expect(hook.result.current.items[0].name).toBe('New item'),
  )
  expect(hook.result.current.total).toBe(76)
})

test('an edit replaces the record in every loaded page and in its own query', async () => {
  const { client, hook } = setup()
  await waitFor(() => expect(hook.result.current.items).toHaveLength(30))
  await act(() => hook.result.current.fetchNextPage())
  const target = pages(client).pages[1].items[0]
  act(() =>
    cache.updated(client, 'items', { ...target, name: 'Renamed' }, getId),
  )
  await waitFor(() =>
    expect(
      hook.result.current.items.find((i) => i.id === target.id)?.name,
    ).toBe('Renamed'),
  )
  expect(client.getQueryData<Item>(keys.record('items', target.id))?.name).toBe(
    'Renamed',
  )
  expect(hook.result.current.total).toBe(75)
})

test('a removal takes the record out of every loaded page and subtracts 1', async () => {
  const { client, hook } = setup()
  await waitFor(() => expect(hook.result.current.items).toHaveLength(30))
  const target = hook.result.current.items[3]
  client.setQueryData(keys.record('items', target.id), target)
  act(() => cache.removed(client, 'items', target.id, getId))
  await waitFor(() =>
    expect(hook.result.current.items.some((i) => i.id === target.id)).toBe(
      false,
    ),
  )
  expect(hook.result.current.total).toBe(74)
  expect(client.getQueryData(keys.record('items', target.id))).toBeUndefined()

  // Removing a record that isn't loaded changes nothing.
  act(() => cache.removed(client, 'items', 'not-loaded', getId))
  expect(hook.result.current.total).toBe(74)
})
