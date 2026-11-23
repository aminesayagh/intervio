import { afterEach, expect, test, vi } from 'vitest'
import { dropReturnTo, peekReturnTo, saveReturnTo } from './returnTo'

afterEach(() => vi.useRealTimers())

test('the saved page is returned until dropped, and expires after an hour', () => {
  vi.useFakeTimers()
  saveReturnTo('/dev/collection?open=1')
  expect(peekReturnTo()).toBe('/dev/collection?open=1')

  dropReturnTo()
  expect(peekReturnTo()).toBeNull()

  saveReturnTo('/dev/collection?open=2')
  vi.advanceTimersByTime(60 * 60 * 1000)
  expect(peekReturnTo()).toBeNull()
})
