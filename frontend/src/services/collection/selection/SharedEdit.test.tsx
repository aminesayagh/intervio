import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { reachRow } from '../testing/panel'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

// Item 001 is a draft, Item 002 valid, Item 003 outdated.
function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(6))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
/** Selects a row by its checkbox, once the pointer reached the row (decision 139). */
const select = async (name: string) => {
  // Its name, as a field or as text (without the right to change it).
  await reachRow(
    await waitFor(() => {
      const shown = screen.queryByDisplayValue(name) ?? screen.queryByText(name)
      if (!shown) throw new Error(`${name} is not in the list yet`)
      return shown
    }),
  )
  await userEvent.click(
    await screen.findByRole('checkbox', { name: `Select ${name}` }),
  )
}
/** The nth row, reached by the pointer: its controls are awake (decision 139). */
const row = async (n: number) => {
  const found = within(screen.getByRole('grid')).getAllByRole('row')[n]
  await userEvent.hover(found)
  return within(found)
}
const status = (source: ReturnType<typeof show>) =>
  source.items().map((item) => item.status)

test('a status chosen on a selected row is saved on every selected row, with Undo', async () => {
  const source = show()
  await select('Item 001')
  await select('Item 003')
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Status: Draft' }),
  )
  expect(await screen.findByText('Applies to 2 items')).toBeInTheDocument()
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Valid' }),
  )

  await waitFor(() =>
    expect(status(source).slice(0, 3)).toEqual(['valid', 'valid', 'valid']),
  )
  expect(
    await screen.findByText('“Status” changed on 2 items.'),
  ).toBeInTheDocument()

  // Each gets its own previous value back.
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
  await waitFor(() =>
    expect(status(source).slice(0, 3)).toEqual(['draft', 'valid', 'outdated']),
  )
})

test('a name changed on a selected row stays on that row', async () => {
  const source = show()
  await select('Item 001')
  await select('Item 002')
  const name = (await row(1)).getByDisplayValue('Item 001')
  await userEvent.clear(name)
  await userEvent.type(name, 'Pump{Enter}')
  await waitFor(() => expect(source.items()[0].name).toBe('Pump'))
  expect(source.items()[1].name).toBe('Item 002')
})

test('a row not selected changes alone', async () => {
  const source = show()
  await select('Item 001')
  await select('Item 002')
  await userEvent.click(
    (await row(3)).getByRole('button', { name: 'Status: Outdated' }),
  )
  expect(screen.queryByText('Applies to 2 items')).not.toBeInTheDocument()
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Draft' }),
  )
  await waitFor(() =>
    expect(status(source).slice(0, 3)).toEqual(['draft', 'valid', 'draft']),
  )
})

test('records the person may not change keep their value', async () => {
  const source = show((record) => ({
    edit: record.name === 'Item 002' ? [] : ['name', 'status'],
  }))
  await select('Item 001')
  await select('Item 002')
  await select('Item 003')
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Status: Draft' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Outdated' }),
  )
  expect(
    await screen.findByText('“Status” changed on 2 of 3 items.'),
  ).toBeInTheDocument()
  expect(status(source).slice(0, 3)).toEqual(['outdated', 'valid', 'outdated'])
})

test('a record whose save fails keeps its value and stays selected, with Retry', async () => {
  const source = show()
  await select('Item 001')
  await select('Item 002')
  await select('Item 003')
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Status: Draft' }),
  )
  // The first save fails: Item 001, the row edited, goes back.
  source.settings.failNext = true
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Outdated' }),
  )
  expect(
    await screen.findByText("“Status” couldn't be changed on 1 item."),
  ).toBeInTheDocument()
  expect(status(source).slice(0, 3)).toEqual(['draft', 'outdated', 'outdated'])
  expect(
    within(screen.getByRole('toolbar', { name: 'Selected records' })).getByText(
      '1 selected',
    ),
  ).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(status(source)[0]).toBe('outdated'))
})
