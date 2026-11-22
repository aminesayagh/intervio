import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AUTOSAVE_DELAY, useAutosave } from './useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('saves the last text once, a moment after typing stops', async () => {
  const save = vi.fn(async () => {})
  const { result } = renderHook(() => useAutosave(save))
  act(() => result.current.change('a'))
  act(() => result.current.change('ab'))
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1))
  expect(save).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(save).toHaveBeenCalledTimes(1)
  expect(save).toHaveBeenCalledWith('ab')
  expect(result.current.status).toBe('saved')
})

test('flush saves at once; text typed during a save is saved after it', async () => {
  let finish: () => void = () => {}
  const save = vi
    .fn<(text: string) => Promise<void>>()
    .mockImplementationOnce(() => new Promise((done) => (finish = done)))
    .mockResolvedValue()
  const { result } = renderHook(() => useAutosave(save))
  act(() => result.current.change('first'))
  act(() => void result.current.flush()) // the save stays open until finish()
  expect(result.current.status).toBe('saving')
  act(() => result.current.change('second'))
  await act(async () => finish())
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(save).toHaveBeenLastCalledWith('second')
  expect(result.current.status).toBe('saved')
})

test('a failed save keeps the text, and Retry saves it', async () => {
  const save = vi
    .fn<(text: string) => Promise<void>>()
    .mockRejectedValueOnce(new Error('down'))
    .mockResolvedValue()
  const { result } = renderHook(() => useAutosave(save))
  act(() => result.current.change('kept'))
  await act(() => result.current.flush())
  expect(result.current.status).toBe('failed')
  await act(() => result.current.retry())
  expect(save).toHaveBeenLastCalledWith('kept')
  expect(result.current.status).toBe('saved')
})
