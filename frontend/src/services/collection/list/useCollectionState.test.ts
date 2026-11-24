import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { AddressProvider } from '../../navigation'
import { listAddress, sortParser } from '../address'
import { isNarrowed, useCollectionState } from './useCollectionState'

const defaultSort = { by: 'updated', direction: 'desc' as const }
const filters = ['status']
const render = () =>
  renderHook(() => useCollectionState('items', defaultSort, { filters }), {
    wrapper: AddressProvider,
  })

afterEach(cleanup)
beforeEach(() => {
  window.history.replaceState(null, '', '/items')
  sessionStorage.clear()
  localStorage.clear()
})

test('reads search, filters and sort from the address, with defaults for the rest', () => {
  window.history.replaceState(
    null,
    '',
    '/items?q=pump&f.status=valid,draft&sort=name:asc&open=7',
  )
  const { result } = render()
  expect(result.current.listing).toEqual({
    search: 'pump',
    filters: { status: ['valid', 'draft'] },
    sort: [{ by: 'name', direction: 'asc' }],
  })
  // No sort, or a wrong one: none chosen, the default order applies.
  expect(sortParser.parse('bad')).toBeNull()
  expect(isNarrowed({ search: '', filters: { owner: [] }, sort: [] })).toBe(
    false,
  )
})

test('a scoped list’s address holds only its scope', () => {
  expect(listAddress('/parts', { item: ['7'] })).toBe('/parts?f.item=7')
})

test('changes replace the address, and the sort is remembered', async () => {
  const before = window.history.length
  const { result } = render()
  act(() => result.current.setFilters({ status: ['valid'] }))
  act(() => result.current.setSearch(' pump '))
  act(() =>
    result.current.setSort([
      { by: 'name', direction: 'asc' },
      { by: 'updated', direction: 'desc' },
    ]),
  )
  await waitFor(() =>
    expect(window.location.search).toBe(
      '?f.status=valid&q=pump&sort=name:asc,updated:desc',
    ),
  )
  expect(window.history.length).toBe(before)
  expect(localStorage.getItem('intervio.collection.items.sort')).toBe(
    'name:asc,updated:desc',
  )

  act(() => result.current.clear())
  await waitFor(() =>
    expect(window.location.search).toBe('?sort=name:asc,updated:desc'),
  )

  // Back to the default order: the sort leaves the address and is forgotten.
  act(() => result.current.setSort([]))
  await waitFor(() => expect(window.location.search).toBe(''))
  expect(result.current.query.sort).toEqual([defaultSort])
  expect(localStorage.getItem('intervio.collection.items.sort')).toBeNull()
})

test('a bare address takes back the tab’s last list state', async () => {
  sessionStorage.setItem(
    'intervio.collection.items.list',
    'q=pump&f.status=valid',
  )
  window.history.replaceState(null, '', '/items?open=7')
  const { result } = render()
  await waitFor(() => expect(result.current.listing.search).toBe('pump'))
  await waitFor(() =>
    expect(window.location.search).toBe('?open=7&q=pump&f.status=valid'),
  )
})

test('without a saved state, a bare address takes the last sort chosen', async () => {
  localStorage.setItem('intervio.collection.items.sort', 'name:asc')
  const { result } = render()
  await waitFor(() =>
    expect(result.current.listing.sort).toEqual([
      { by: 'name', direction: 'asc' },
    ]),
  )
})

test('the tab remembers the list it shows, even one opened from an address', () => {
  window.history.replaceState(null, '', '/items?q=valve&sort=name:asc&open=7')
  render()
  expect(sessionStorage.getItem('intervio.collection.items.list')).toBe(
    'q=valve&sort=name:asc&open=7',
  )
})

test('coming back on a bare address reopens the record open last', async () => {
  sessionStorage.setItem('intervio.collection.items.list', 'q=valve&open=7')
  render()
  await waitFor(() => expect(window.location.search).toBe('?q=valve&open=7'))
})

test('an address naming a record keeps it, and still takes back the list', async () => {
  sessionStorage.setItem('intervio.collection.items.list', 'q=valve&open=7')
  window.history.replaceState(null, '', '/items?open=9')
  render()
  await waitFor(() => expect(window.location.search).toBe('?open=9&q=valve'))
})
