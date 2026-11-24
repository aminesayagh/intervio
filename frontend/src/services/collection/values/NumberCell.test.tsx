import {
  act,
  cleanup,
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
import { NumberCell } from './NumberCell'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

async function quantityOf(row: number) {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByDisplayValue('Item 001')
  const rows = within(screen.getByRole('grid')).getAllByRole('row')
  // Under the pointer, the row's cells show their editors.
  await userEvent.hover(rows[row])
  return {
    source,
    field: within(rows[row]).getByRole('textbox', { name: 'Quantity' }),
    row: rows[row],
  }
}

test('the quantity is edited in its table cell, and saved on Enter', async () => {
  // Item 002 has a quantity of 2 (makeItems): change it.
  const { source, field } = await quantityOf(2)
  await userEvent.clear(field)
  await userEvent.type(field, '7{Enter}')
  await waitFor(() => expect(source.items()[1].quantity).toBe(7))
})

test('the chevrons step the quantity up and down, each step saved', async () => {
  const { source, row } = await quantityOf(2)
  const before = source.items()[1].quantity!
  await userEvent.click(within(row).getByRole('button', { name: /increase/i }))
  await waitFor(() => expect(source.items()[1].quantity).toBe(before + 1))
  await userEvent.click(within(row).getByRole('button', { name: /decrease/i }))
  await waitFor(() => expect(source.items()[1].quantity).toBe(before))
})

test('an emptied quantity saves no value; one below the minimum is kept at it', async () => {
  const { source, field } = await quantityOf(2)
  await userEvent.clear(field)
  await userEvent.tab()
  await waitFor(() => expect(source.items()[1].quantity).toBeNull())
  await userEvent.type(field, '0{Enter}')
  await waitFor(() => expect(source.items()[1].quantity).toBe(1))
  // The field stays the same element after a save (it is not rebuilt).
  expect(field.isConnected).toBe(true)
})

test('until its row is hovered or focused, the quantity is text; the focus wakes it', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByDisplayValue('Item 001')
  const row = within(within(screen.getByRole('grid')).getAllByRole('row')[2])
  expect(row.queryByRole('textbox', { name: 'Quantity' })).toBeNull()
  const text = row.getByText('2')
  act(() => text.focus())
  const field = await row.findByRole('textbox', { name: 'Quantity' })
  expect(field).toHaveFocus()
  expect(field).toHaveValue('2')
})

test('a float shows its decimals, and a step adds its smallest unit', async () => {
  const save = vi.fn(async () => {})
  render(
    <NumberCell
      record={{ price: 2.5 as number | null }}
      edit={{
        type: 'number',
        value: (r) => r.price,
        patch: (price) => ({ price }),
        decimals: 2,
      }}
      label="Price"
      save={save}
    />,
  )
  expect(screen.getByRole('textbox', { name: 'Price' })).toHaveValue('2.50')
  await userEvent.click(screen.getByRole('button', { name: /increase/i }))
  expect(save).toHaveBeenCalledWith({ price: 2.51 })
})
