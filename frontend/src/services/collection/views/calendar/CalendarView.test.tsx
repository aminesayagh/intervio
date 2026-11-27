import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../../i18n'
import { Collection } from '../../Collection'
import { itemSource, makeItems } from '../../testing/items'
import { setScreenWidth, stubElementSizes } from '../../testing/layout'
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
const definition = (rights?: Parameters<typeof itemDefinition>[2]) => ({
  ...itemDefinition(itemSource(makeItems(60)), 'test-items', rights),
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

test('a record opens in the panel, from the keyboard too', async () => {
  renderAt('/items', <Collection definition={definition()} />)
  // A pointer starts FullCalendar's drag handling, which needs a real layout.
  ;(await screen.findByText('Item 003')).closest('button')!.focus()
  await userEvent.keyboard('{Enter}')
  expect(
    await screen.findByRole('complementary', { name: 'Item 003' }),
  ).toBeInTheDocument()
})

test('a record changes its date from its calendar button (MAS-53)', async () => {
  renderAt(
    '/items',
    <Collection
      definition={definition(() => ({ edit: ['due'], actions: [], add: [] }))}
    />,
  )
  // From the keyboard: FullCalendar's drag handling needs a real layout, which
  // jsdom doesn't have (it also keeps the records hidden while it measures them).
  ;(await screen.findByLabelText('Change the date of Item 003')).focus()
  await userEvent.keyboard('{Enter}')
  const dialog = await screen.findByRole('dialog', {
    name: 'Change the date of Item 003',
  })
  expect(dialog).toHaveTextContent('Due')
  expect(dialog).toHaveTextContent('12/3/2026')
})

test("a record the person can't edit has no calendar button", async () => {
  renderAt(
    '/items',
    <Collection
      definition={definition(() => ({ edit: ['name'], actions: [], add: [] }))}
    />,
  )
  expect(await screen.findByText('Item 003')).toBeInTheDocument()
  expect(screen.queryByLabelText('Change the date of Item 003')).toBeNull()
})

test('the toolbar counts the records without a date, and lists them (MAS-55)', async () => {
  renderAt('/items', <Collection definition={definition()} />)
  // Every sixth of the 60 items has no due date.
  const count = await screen.findByRole('button', { name: '10 without a date' })
  await userEvent.click(count)
  const list = await screen.findByRole('dialog', {
    name: 'Records without a date',
  })
  expect(list).toHaveTextContent('Item 006')
  expect(list).toHaveTextContent('Item 060')
  expect(list).not.toHaveTextContent('Item 001')
})

test('on a phone the calendar button stays, as the way to move a record (MAS-56)', async () => {
  setScreenWidth(390)
  try {
    renderAt(
      '/items',
      <Collection
        definition={definition(() => ({ edit: ['due'], actions: [], add: [] }))}
      />,
    )
    expect(
      await screen.findByLabelText('Change the date of Item 003'),
    ).toBeInTheDocument()
  } finally {
    setScreenWidth(1128)
  }
})
