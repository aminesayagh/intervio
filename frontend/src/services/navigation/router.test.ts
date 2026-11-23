import { act, renderHook } from '@testing-library/react'
import { useQueryState } from 'nuqs'
import { expect, test } from 'vitest'
import { entryState, isOwnEntry, navigate, usePath } from './router'
import { AddressProvider } from './query'

/** Starts at /start, with the router (and nuqs) mounted. */
function start<T>(hook: () => T = () => undefined as T) {
  window.history.replaceState(null, '', '/start')
  return renderHook(hook, { wrapper: AddressProvider })
}

test('navigate pushes an entry marked as the app’s own at once, replace does not add one', () => {
  start()
  const before = window.history.length
  expect(isOwnEntry()).toBe(false) // the visit's first page

  // The address changes before navigate returns: callers read it right after.
  act(() => navigate('/resources'))
  expect(window.location.pathname).toBe('/resources')
  expect(window.history.length).toBe(before + 1)
  expect(isOwnEntry()).toBe(true)

  act(() => navigate('/settings', { replace: true }))
  expect(window.history.length).toBe(before + 1)
})

test('the hooks re-render on navigation', () => {
  // nuqs follows the entries navigate pushes.
  const { result } = start(() => ({
    path: usePath(),
    open: useQueryState('open')[0],
  }))
  act(() => navigate('/resources?open=abc'))
  expect(result.current).toEqual({ path: '/resources', open: 'abc' })
})

test('an entry’s state survives a nuqs update, and is read back on Back', async () => {
  const { result } = start(() => useQueryState('sort')[1])
  act(() => navigate('/resources?open=7', { state: { panel: 'items' } }))
  expect(entryState().panel).toBe('items')

  // nuqs replaces the entry with its own update: the marks stay.
  await act(() => result.current('name'))
  expect(window.location.search).toContain('sort=name')
  expect(entryState().panel).toBe('items')

  act(() => navigate('/other', { state: { drill: 1 } }))
  await act(async () => {
    const popped = new Promise((done) =>
      window.addEventListener('popstate', done, { once: true }),
    )
    window.history.back()
    await popped
  })
  expect(entryState()).toMatchObject({ panel: 'items', intervio: true })
})
