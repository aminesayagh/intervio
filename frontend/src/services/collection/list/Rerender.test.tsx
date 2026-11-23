import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import type { TextField } from '../definition'
import { itemSource, makeItems, type Item } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { reachRow } from '../testing/panel'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

/**
 * A guard against a slow table: an action on one row renders that row again, not
 * every row. Each name cell reads its record's name when it renders, so the reads
 * count the cells rendered.
 */
function show() {
  const definition = itemDefinition(itemSource(makeItems(8)))
  let reads = 0
  definition.columns = definition.columns.map((column) => {
    if (column.id !== 'name') return column
    const field = column.field as TextField<Item>
    return {
      ...column,
      field: { ...field, value: (item: Item) => (reads++, field.value(item)) },
    }
  })
  renderAt('/items', <Collection definition={definition} />)
  return { reads: () => reads, reset: () => (reads = 0) }
}

test('selecting a row renders that row again, not the others', async () => {
  const count = show()
  await screen.findByText('8 items')
  // The pointer reaches the two rows first: their checkboxes wake (decision 139).
  await reachRow(await screen.findByDisplayValue('Item 001'))
  await reachRow(await screen.findByDisplayValue('Item 002'))
  const checkbox = await screen.findByRole('checkbox', {
    name: 'Select Item 001',
  })
  count.reset()
  await userEvent.click(checkbox)
  await screen.findByText('1 selected')
  // Before rows read their marks from a store, every row rendered: 8 here.
  expect(count.reads()).toBeLessThanOrEqual(1)

  count.reset()
  await userEvent.click(
    await screen.findByRole('checkbox', { name: 'Select Item 002' }),
  )
  await screen.findByText('2 selected')
  expect(count.reads()).toBeLessThanOrEqual(1)
})

test('opening a record, and the next one, doesn’t render the table again', async () => {
  const definition = itemDefinition(itemSource(makeItems(8)))
  // Only the table reads the columns, each time it renders.
  let renders = 0
  const columns = definition.columns
  Object.defineProperty(definition, 'columns', {
    get() {
      renders++
      return columns
    },
  })
  renderAt('/items', <Collection definition={definition} />)
  await screen.findByText('8 items')
  renders = 0
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  await screen.findByRole('complementary', { name: 'Item 001' })
  await userEvent.keyboard('{ArrowDown}')
  await screen.findByRole('complementary', { name: 'Item 002' })
  // Before the table got only stable props, it rendered with every change of record.
  expect(renders).toBe(0)
})

test('a row builds its controls only once it is reached', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(8)))} />,
  )
  await screen.findByText('8 items')
  const row = screen
    .getByRole('grid')
    .querySelector<HTMLElement>('[role="row"][data-key]')!
  // Still: no menu, no checkbox, no text field of React Aria yet (decision 139).
  const controls = () =>
    row.querySelectorAll('[aria-haspopup], input[type="checkbox"]').length
  expect(controls()).toBe(0)
  await reachRow(row)
  expect(controls()).toBeGreaterThan(0)
})
