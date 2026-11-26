import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../../i18n'
import { Collection } from '../../Collection'
import { itemSource, makeItems } from '../../testing/items'
import { stubElementSizes } from '../../testing/layout'
import { renderAt } from '../../testing/render'
import { itemDefinition } from '../../testing/testDefinition'

beforeAll(() => {
  stubElementSizes({ width: 1128, height: 600, itemHeight: 64 })
  // The calendar opens on today's month: December 2026, where the items start.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-12-10T12:00:00') })
})
afterAll(() => vi.useRealTimers())
afterEach(cleanup)

// Items are due a day apart from 1 December 2026; every sixth has no date.
const definition = () => ({
  ...itemDefinition(itemSource(makeItems(60))),
  views: [
    {
      id: 'calendar',
      name: 'Calendar',
      type: 'calendar' as const,
      date: 'due',
      card: ['owner'],
    },
  ],
})

test('the month shows the records due in it, and moves on (MAS-52)', async () => {
  renderAt('/items', <Collection definition={definition()} />)
  expect(await screen.findByText('Item 001')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'December 2026' })).toBeVisible()
  // No due date: never on the calendar. Due on 19 January: next month.
  expect(screen.queryByText('Item 006')).toBeNull()
  expect(screen.queryByText('Item 050')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Item 050')).toBeInTheDocument()
})

test('a record opens in the panel', async () => {
  renderAt('/items', <Collection definition={definition()} />)
  await userEvent.click(await screen.findByText('Item 003'))
  expect(
    await screen.findByRole('complementary', { name: 'Item 003' }),
  ).toBeInTheDocument()
})
