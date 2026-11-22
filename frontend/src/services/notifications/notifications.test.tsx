import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  clearNotifications,
  dismissKey,
  dismissScope,
  Notifications,
  notify,
} from '.'

beforeEach(() => render(<Notifications />))
afterEach(() => {
  act(() => clearNotifications())
  cleanup()
  vi.useRealTimers()
})

const gone = (text: string) =>
  waitFor(() => expect(screen.queryByText(text)).toBeNull())

test('a new notification about the same value replaces the old one', async () => {
  act(() => void notify({ text: 'First', tone: 'error', key: 'items:1:name' }))
  expect(await screen.findByText('First')).toBeInTheDocument()
  act(() => void notify({ text: 'Second', tone: 'error', key: 'items:1:name' }))
  expect(await screen.findByText('Second')).toBeInTheDocument()
  await gone('First')
  act(() => dismissKey('items:1:name'))
  await gone('Second')
})

test('leaving an interaction removes its notifications, and those inside it', async () => {
  act(() => {
    notify({ text: 'About the record', tone: 'error', scope: 'items:record:1' })
    notify({ text: 'About the list', tone: 'error', scope: 'items' })
    notify({ text: 'Elsewhere', tone: 'confirm', scope: 'items-2' })
  })
  expect(await screen.findByText('About the record')).toBeInTheDocument()
  act(() => dismissScope('items:record:1'))
  await gone('About the record')
  expect(screen.getByText('About the list')).toBeInTheDocument()
  act(() => dismissScope('items'))
  await gone('About the list')
  // "items" does not cover "items-2".
  expect(screen.getByText('Elsewhere')).toBeInTheDocument()
})

test('an action runs once and closes its notification', async () => {
  const run = vi.fn()
  act(
    () =>
      void notify({
        text: 'Saved failed',
        tone: 'error',
        action: { label: 'Retry', run },
      }),
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Retry' }))
  expect(run).toHaveBeenCalledTimes(1)
  await gone('Saved failed')
})
