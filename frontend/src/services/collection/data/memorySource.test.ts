import { expect, test } from 'vitest'
import { ApiError } from '../../http'
import { itemSource, makeItems } from '../testing/items'
import { setScreenWidth } from '../testing/layout'
import type { ListQuery } from '../types'

const query = (over: Partial<ListQuery> = {}): ListQuery => ({
  search: '',
  filters: {},
  sort: { by: 'updated', direction: 'desc' },
  cursor: null,
  ...over,
})

test('pages of 30 with a total, until the last page', async () => {
  const source = itemSource(makeItems(75))
  const first = await source.list(query())
  expect(first.items).toHaveLength(30)
  expect(first.total).toBe(75)
  expect(first.items[0].name).toBe('Item 001') // newest first

  const second = await source.list(query({ cursor: first.nextCursor }))
  const third = await source.list(query({ cursor: second.nextCursor }))
  expect(third.items).toHaveLength(15)
  expect(third.nextCursor).toBeNull()
})

test('a record created between two pages neither repeats nor skips one', async () => {
  const source = itemSource(makeItems(60))
  const first = await source.list(
    query({ sort: { by: 'name', direction: 'asc' } }),
  )
  await source.create!(
    { name: 'Item 000', status: 'draft' } as never,
    undefined,
  )
  const second = await source.list(
    query({ sort: { by: 'name', direction: 'asc' }, cursor: first.nextCursor }),
  )
  const names = [...first.items, ...second.items].map((item) => item.name)
  expect(new Set(names).size).toBe(60)
  expect(names).toEqual(makeItems(60).map((item) => item.name))
})

test('search, filters and sort', async () => {
  const source = itemSource(makeItems(30))
  expect((await source.list(query({ search: 'item 02' }))).total).toBe(10)
  const valid = await source.list(query({ filters: { status: ['valid'] } }))
  expect(valid.items.every((item) => item.status === 'valid')).toBe(true)
  const byName = await source.list(
    query({ sort: { by: 'name', direction: 'desc' } }),
  )
  expect(byName.items[0].name).toBe('Item 030')
  const byQuantity = await source.list(
    query({ sort: { by: 'quantity', direction: 'asc' } }),
  )
  expect(byQuantity.items[0].quantity).toBe(1)
  expect(byQuantity.items.at(-1)!.quantity).toBeNull()
})

test('a missing or archived record is a 404, and a planned failure a 500 once', async () => {
  const source = itemSource(makeItems(3))
  const id = makeItems(3)[0].id
  await source.archive!(id, undefined)
  await expect(source.one(id, undefined)).rejects.toMatchObject({ status: 404 })
  await source.restore!(id, undefined)
  expect((await source.one(id, undefined)).name).toBe('Item 001')

  source.settings.failNext = true
  await expect(source.list(query())).rejects.toBeInstanceOf(ApiError)
  expect((await source.list(query())).items).toHaveLength(2 + 1)
})

test('the screen width stub answers media queries', () => {
  setScreenWidth(1200)
  expect(window.matchMedia('(min-width: 1440px)').matches).toBe(false)
  expect(window.matchMedia('(min-width: 1024px)').matches).toBe(true)
  setScreenWidth(1440)
  expect(window.matchMedia('(min-width: 1440px)').matches).toBe(true)
})
