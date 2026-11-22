import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

// A wide list, so the Planned column fits in the table.
beforeAll(() => stubElementSizes({ width: 4000, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
const row = async (n: number) =>
  (await screen.findByRole('grid')).querySelectorAll('[role="row"][data-key]')[
    n - 1
  ] as HTMLElement
/** Inside the Planned field. */
const planned = (scope: HTMLElement) =>
  within(within(scope).getByRole('group', { name: 'Planned' }))
async function pick(scope: HTMLElement, first: RegExp, last: RegExp) {
  await userEvent.click(
    planned(scope).getByRole('button', { name: /calendar/i }),
  )
  const calendar = within(await screen.findByRole('dialog'))
  await userEvent.click(calendar.getByRole('button', { name: first }))
  await userEvent.click(calendar.getByRole('button', { name: last }))
}

test('a range picked in the calendar is saved: first the start, then the end', async () => {
  const source = show()
  // Item 001 is planned from 1 to 5 December 2026.
  await pick(await row(1), /December 10, 2026/, /December 12, 2026/)
  await waitFor(() =>
    expect(source.items()[0].planned).toEqual({
      start: '2026-12-10',
      end: '2026-12-12',
    }),
  )
})

test('a refused range goes back, with a message', async () => {
  const source = show()
  source.settings.failing = true
  await pick(await row(1), /December 20, 2026/, /December 22, 2026/)
  expect(
    await screen.findByText("“Planned” couldn't be saved for Item 001."),
  ).toBeInTheDocument()
  expect(source.items()[0].planned).toEqual({
    start: '2026-12-01',
    end: '2026-12-05',
  })
})

test('the panel sets a range where there was none', async () => {
  const source = show()
  // Item 004 has no planned period: the calendar opens on this month.
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 004' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 004' })
  await userEvent.click(
    planned(aside).getByRole('button', { name: /calendar/i }),
  )
  const calendar = within(await screen.findByRole('dialog'))
  const days = calendar
    .getAllByRole('button')
    .filter((b) => /, \d{4}/.test(b.getAttribute('aria-label') ?? ''))
  await userEvent.click(days[2])
  await userEvent.click(days[6])
  await waitFor(() => expect(source.items()[3].planned?.start).toMatch(/-03$/))
  expect(source.items()[3].planned?.end).toMatch(/-07$/)
})

test('without the right, the period is text only', async () => {
  show(() => ({ edit: [] }))
  const cells = within(await row(1))
  expect(cells.queryByRole('group', { name: 'Planned' })).toBeNull()
  expect(cells.getByText(/Dec 1.+5, 2026/)).toBeInTheDocument()
})
