import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import {
  entryState,
  isOwnEntry,
  navigate,
  setSearchParams,
  usePath,
  useSearchParams,
} from './router'

beforeEach(() => window.history.replaceState(null, '', '/start'))

test('navigate pushes an entry marked as the app’s own, replace does not add one', () => {
  const before = window.history.length
  expect(isOwnEntry()).toBe(false) // the visit's first page

  navigate('/resources')
  expect(window.location.pathname).toBe('/resources')
  expect(window.history.length).toBe(before + 1)
  expect(isOwnEntry()).toBe(true)

  navigate('/settings', { replace: true })
  expect(window.history.length).toBe(before + 1)
})

test('setSearchParams changes only the query string and leaves empty values out', () => {
  navigate('/resources?old=1')
  setSearchParams({ q: 'pump', open: null, sort: '' }, { replace: true })
  expect(window.location.pathname).toBe('/resources')
  expect(window.location.search).toBe('?q=pump')

  setSearchParams({})
  expect(window.location.search).toBe('')
})

test('the hooks re-render on navigation', () => {
  const { result } = renderHook(() => ({
    path: usePath(),
    open: useSearchParams().get('open'),
  }))
  act(() => navigate('/resources?open=abc'))
  expect(result.current).toEqual({ path: '/resources', open: 'abc' })
})

test('an entry can carry extra state, read back with entryState', () => {
  setSearchParams({ open: '7' }, { state: { panel: 'items' } })
  expect(entryState().panel).toBe('items')
  expect(isOwnEntry()).toBe(true)
})
