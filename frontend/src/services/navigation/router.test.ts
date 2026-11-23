import { act, renderHook } from '@testing-library/react'
import { useQueryState } from 'nuqs'
import { beforeEach, expect, test } from 'vitest'
import { entryState, isOwnEntry, navigate, usePath } from './router'
import { QueryProvider } from './query'

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

test('the hooks re-render on navigation', () => {
  // nuqs follows the entries navigate pushes.
  const { result } = renderHook(
    () => ({ path: usePath(), open: useQueryState('open')[0] }),
    { wrapper: QueryProvider },
  )
  act(() => navigate('/resources?open=abc'))
  expect(result.current).toEqual({ path: '/resources', open: 'abc' })
})

test('an entry can carry extra state, read back with entryState', () => {
  navigate('/resources?open=7', { state: { panel: 'items' } })
  expect(entryState().panel).toBe('items')
  expect(isOwnEntry()).toBe(true)
})
