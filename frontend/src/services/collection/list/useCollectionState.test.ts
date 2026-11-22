import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import {
  isNarrowed,
  readListing,
  useCollectionState,
  writeListing,
} from './useCollectionState'

const defaultSort = { by: 'updated', direction: 'desc' as const }

beforeEach(() => {
  window.history.replaceState(null, '', '/items')
  sessionStorage.clear()
  localStorage.clear()
})

test('reads search, filters and sort from the address, with defaults for the rest', () => {
  const listing = readListing(
    new URLSearchParams('q=pump&f.status=valid,draft&sort=name:asc&open=7'),
  )
  expect(listing).toEqual({
    search: 'pump',
    filters: { status: ['valid', 'draft'] },
    sort: { by: 'name', direction: 'asc' },
  })
  // No sort, or a wrong one: none chosen, the default order applies.
  expect(readListing(new URLSearchParams('sort=bad')).sort).toBeNull()
})

test('writes only what is set, and keeps other parameters', () => {
  const params = writeListing(new URLSearchParams('open=7&q=old'), {
    search: ' valve ',
    filters: { status: ['valid'], owner: [] },
    sort: null,
  })
  expect(params.toString()).toBe('open=7&q=valve&f.status=valid')
  // A sort chosen goes to the address, even when it matches the default order.
  expect(
    writeListing(new URLSearchParams(), {
      search: '',
      filters: {},
      sort: defaultSort,
    }).toString(),
  ).toBe('sort=updated%3Adesc')
  expect(isNarrowed({ search: '', filters: { owner: [] }, sort: null })).toBe(
    false,
  )
})

test('changes replace the address, and the sort is remembered', () => {
  const before = window.history.length
  const { result } = renderHook(() => useCollectionState('items', defaultSort))
  act(() => result.current.setFilter('status', ['valid']))
  act(() => result.current.setSearch('pump'))
  act(() => result.current.setSort({ by: 'name', direction: 'asc' }))
  expect(window.location.search).toBe('?q=pump&f.status=valid&sort=name%3Aasc')
  expect(window.history.length).toBe(before)
  expect(localStorage.getItem('intervio.collection.items.sort')).toBe(
    'name:asc',
  )

  act(() => result.current.clear())
  expect(window.location.search).toBe('?sort=name%3Aasc')

  // Back to the default order: the sort leaves the address and is forgotten.
  act(() => result.current.setSort(null))
  expect(window.location.search).toBe('')
  expect(result.current.query.sort).toEqual(defaultSort)
  expect(localStorage.getItem('intervio.collection.items.sort')).toBeNull()
})

test('a bare address takes back the tab’s last list state', () => {
  sessionStorage.setItem(
    'intervio.collection.items.list',
    'q=pump&f.status=valid',
  )
  window.history.replaceState(null, '', '/items?open=7')
  const { result } = renderHook(() => useCollectionState('items', defaultSort))
  expect(result.current.listing.search).toBe('pump')
  expect(window.location.search).toBe('?open=7&q=pump&f.status=valid')
})

test('without a saved state, a bare address takes the last sort chosen', () => {
  localStorage.setItem('intervio.collection.items.sort', 'name:asc')
  const { result } = renderHook(() => useCollectionState('items', defaultSort))
  expect(result.current.listing.sort).toEqual({ by: 'name', direction: 'asc' })
})

test('the tab remembers the list it shows, even one opened from an address', () => {
  window.history.replaceState(null, '', '/items?q=valve&sort=name:asc&open=7')
  renderHook(() => useCollectionState('items', defaultSort))
  expect(sessionStorage.getItem('intervio.collection.items.list')).toBe(
    'q=valve&sort=name%3Aasc&open=7',
  )
})

test('coming back on a bare address reopens the record open last', () => {
  sessionStorage.setItem('intervio.collection.items.list', 'q=valve&open=7')
  window.history.replaceState(null, '', '/items')
  renderHook(() => useCollectionState('items', defaultSort))
  expect(window.location.search).toBe('?q=valve&open=7')
})

test('an address naming a record keeps it, and still takes back the list', () => {
  sessionStorage.setItem('intervio.collection.items.list', 'q=valve&open=7')
  window.history.replaceState(null, '', '/items?open=9')
  renderHook(() => useCollectionState('items', defaultSort))
  expect(window.location.search).toBe('?open=9&q=valve')
})
