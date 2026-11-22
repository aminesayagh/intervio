import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'
import { DateCell } from './DateCell'

// A wide list, so the Due column fits in the table.
beforeAll(() => stubElementSizes({ width: 4000, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(8))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
/** Inside the Due field (the row or the panel also has the Planned period). */
const due = (scope: HTMLElement) =>
  within(within(scope).getByRole('group', { name: 'Due' }))
/** The row, under the pointer: its cells show their editors. */
async function row(n: number) {
  const found = (await screen.findByRole('grid')).querySelectorAll(
    '[role="row"][data-key]',
  )[n - 1] as HTMLElement
  await userEvent.hover(found)
  return found
}

test('a day picked in the calendar is saved', async () => {
  const source = show()
  // Item 001 is due on 1 December 2026.
  await userEvent.click(
    due(await row(1)).getByRole('button', { name: /calendar/i }),
  )
  const calendar = await screen.findByRole('dialog')
  await userEvent.click(
    within(calendar).getByRole('button', { name: /December 15, 2026/ }),
  )
  await waitFor(() => expect(source.items()[0].due).toBe('2026-12-15'))
})

test('a segment changed with the arrow keys is saved when the field is left', async () => {
  const source = show()
  const day = due(await row(2)).getByRole('spinbutton', { name: /day/i })
  await userEvent.click(day)
  await userEvent.keyboard('{ArrowUp}')
  expect(source.items()[1].due).toBe('2026-12-02')
  act(() => (document.activeElement as HTMLElement).blur())
  fireEvent.focusOut(day)
  await waitFor(() => expect(source.items()[1].due).toBe('2026-12-03'))
})

test('a refused date goes back, with a message', async () => {
  const source = show()
  source.settings.failing = true
  await userEvent.click(
    due(await row(1)).getByRole('button', { name: /calendar/i }),
  )
  await userEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: /December 20, 2026/,
    }),
  )
  expect(
    await screen.findByText("“Due” couldn't be saved for Item 001."),
  ).toBeInTheDocument()
  expect(source.items()[0].due).toBe('2026-12-01')
})

test('the panel picks a date too, even where there was none', async () => {
  const source = show()
  // Item 006 has no due date.
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 006' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 006' })
  await userEvent.click(due(aside).getByRole('button', { name: /calendar/i }))
  const calendar = await screen.findByRole('dialog')
  const days = within(calendar)
    .getAllByRole('button')
    .filter((b) => /, \d{4}/.test(b.getAttribute('aria-label') ?? ''))
  await userEvent.click(days[9])
  await waitFor(() => expect(source.items()[5].due).toMatch(/^\d{4}-\d{2}-10$/))
})

test('without the right, the date is text only', async () => {
  show(() => ({ edit: [] }))
  const cells = within(await row(1))
  expect(cells.queryByRole('spinbutton')).toBeNull()
  expect(cells.getByText('Dec 1, 2026')).toBeInTheDocument()
})

test('with a time, the field has hours and minutes', () => {
  render(
    <DateCell
      record={{ at: '2026-12-01T09:30' as string | null }}
      edit={{
        type: 'date',
        time: true,
        value: (r) => r.at,
        patch: (at) => ({ at }),
      }}
      label="Visit"
      save={vi.fn(async () => {})}
    />,
  )
  expect(screen.getByRole('spinbutton', { name: /hour/i })).toBeInTheDocument()
  expect(
    screen.getByRole('spinbutton', { name: /minute/i }),
  ).toBeInTheDocument()
})
