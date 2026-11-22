import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(count = 8, rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(count))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
const select = async (name: string) =>
  userEvent.click(
    await screen.findByRole('checkbox', { name: `Select ${name}` }),
  )
const toolbar = () => screen.getByRole('toolbar', { name: 'Selected records' })
/** Gone from the table (an archived record stays in the source, hidden). */
const archived = (...names: string[]) =>
  names.every(
    (name) => !screen.queryByDisplayValue(name) && !screen.queryByText(name),
  )

test('selected rows put their count and actions in the toolbar; × brings the search back', async () => {
  show()
  await select('Item 001')
  await select('Item 003')
  expect(within(toolbar()).getByText('2 selected')).toBeInTheDocument()
  expect(
    within(toolbar()).getByRole('button', { name: 'Archive' }),
  ).toBeInTheDocument()
  expect(
    within(toolbar()).getByRole('button', { name: 'Remove' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

  await userEvent.click(
    within(toolbar()).getByRole('button', { name: 'Clear selection' }),
  )
  expect(await screen.findByRole('searchbox')).toBeInTheDocument()
  expect(
    screen.getByRole('checkbox', { name: 'Select Item 001' }),
  ).not.toBeChecked()
})

test('the header checkbox selects the loaded rows only', async () => {
  show(75)
  await screen.findByText('75 items')
  await userEvent.click(screen.getByRole('checkbox', { name: 'Select All' }))
  // The first page: 30 of the 75.
  expect(within(toolbar()).getByText('30 selected')).toBeInTheDocument()
})

test('Archive asks first, in the plural, then the records leave the list', async () => {
  show()
  await select('Item 001')
  await select('Item 003')
  await userEvent.click(
    within(toolbar()).getByRole('button', { name: 'Archive' }),
  )
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Archive 2 items?',
  })
  expect(within(dialog).getByText('They leave the list.')).toBeInTheDocument()
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Archive 2 items' }),
  )
  await waitFor(() => expect(archived('Item 001', 'Item 003')).toBe(true))
  expect(await screen.findByText('6 items')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('searchbox')).toBeInTheDocument())
})

test('records the person may not archive are left out, and the dialog says so', async () => {
  show(8, (record) => ({
    edit: [],
    actions: record.name === 'Item 002' ? [] : ['archive'],
  }))
  await select('Item 001')
  await select('Item 002')
  await select('Item 003')
  await userEvent.click(
    within(toolbar()).getByRole('button', { name: 'Archive' }),
  )
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Archive 2 of 3 items?',
  })
  expect(
    within(dialog).getByText(
      "You can't archive Item 002, so it stays in the list.",
    ),
  ).toBeInTheDocument()
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Archive 2 items' }),
  )
  await waitFor(() => expect(archived('Item 001', 'Item 003')).toBe(true))
  expect(archived('Item 002')).toBe(false)
})

test('an action no selected record allows is not offered', async () => {
  show(8, () => ({ edit: [], actions: ['archive'] }))
  await select('Item 001')
  expect(
    within(toolbar()).queryByRole('button', { name: 'Remove' }),
  ).not.toBeInTheDocument()
})

test('a record that fails stays selected, and Retry archives it', async () => {
  const source = show()
  await select('Item 001')
  await select('Item 003')
  // The first request fails: Item 001.
  source.settings.failNext = true
  await userEvent.click(
    within(toolbar()).getByRole('button', { name: 'Archive' }),
  )
  await userEvent.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Archive 2 items',
    }),
  )
  expect(
    await screen.findByText("Item 001 couldn't be archived."),
  ).toBeInTheDocument()
  expect(archived('Item 003')).toBe(true)
  await waitFor(() =>
    expect(within(toolbar()).getByText('1 selected')).toBeInTheDocument(),
  )

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(archived('Item 001')).toBe(true))
})

test('a new search clears the selection', async () => {
  show()
  await select('Item 001')
  await userEvent.click(
    within(toolbar()).getByRole('button', { name: 'Clear selection' }),
  )
  await select('Item 002')
  act(() => window.history.pushState(null, '', '/items?q=Item'))
  act(() => window.dispatchEvent(new PopStateEvent('popstate')))
  await waitFor(() =>
    expect(
      screen.queryByRole('toolbar', { name: 'Selected records' }),
    ).not.toBeInTheDocument(),
  )
})
