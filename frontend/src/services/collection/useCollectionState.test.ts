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
    defaultSort,
  )
  expect(listing).toEqual({
    search: 'pump',
    filters: { status: ['valid', 'draft'] },
    sort: { by: 'name', direction: 'asc' },
  })
  expect(
    readListing(new URLSearchParams('sort=bad'), defaultSort).sort,
  ).toEqual(defaultSort)
})

test('writes only what differs from the defaults, and keeps other parameters', () => {
  const params = writeListing(
    new URLSearchParams('open=7&q=old'),
    {
      search: ' valve ',
      filters: { status: ['valid'], owner: [] },
      sort: defaultSort,
    },
    defaultSort,
  )
  expect(params.toString()).toBe('open=7&q=valve&f.status=valid')
  expect(
    isNarrowed({ search: '', filters: { owner: [] }, sort: defaultSort }),
  ).toBe(false)
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
    'q=valve&sort=name%3Aasc',
  )
})
