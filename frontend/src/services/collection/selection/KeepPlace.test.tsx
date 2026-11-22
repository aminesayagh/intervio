import { cleanup, screen, waitFor, within } from '@testing-library/react'
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

// Item 001 and 004 are drafts, 003 and 006 outdated, 002 and 005 valid.
function show(url: string) {
  const source = itemSource(makeItems(6))
  renderAt(url, <Collection definition={itemDefinition(source)} />)
  return source
}
/** The names in the table, top to bottom. */
const names = () =>
  within(screen.getByRole('grid'))
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('data-key'))
    .sort(
      (a, b) =>
        Number(a.getAttribute('aria-rowindex')) -
        Number(b.getAttribute('aria-rowindex')),
    )
    .map(
      (row) =>
        row.querySelector<HTMLInputElement>('input[aria-label="Name"]')!.value,
    )
const line = () => screen.queryByText('Changed records keep their place.')

async function setStatus(from: string, to: string) {
  await userEvent.click(
    (await screen.findAllByRole('button', { name: `Status: ${from}` }))[0],
  )
  await userEvent.click(await screen.findByRole('menuitemradio', { name: to }))
}

test('in a sorted list, a changed record keeps its place until Sort now', async () => {
  const source = show('/items?sort=status:asc')
  await screen.findByText('6 items')
  const before = [
    'Item 001',
    'Item 004',
    'Item 003',
    'Item 006',
    'Item 002',
    'Item 005',
  ]
  expect(names()).toEqual(before)

  // Item 001 becomes valid: sorted, it would go down among the valid ones.
  await setStatus('Draft', 'Valid')
  await waitFor(() => expect(source.items()[0].status).toBe('valid'))
  expect(
    await screen.findByText('Changed records keep their place.'),
  ).toBeInTheDocument()
  expect(names()).toEqual(before)

  await userEvent.click(screen.getByRole('button', { name: 'Sort now' }))
  await waitFor(() => expect(names()[0]).toBe('Item 004'))
  expect(names()).toContain('Item 001')
  await waitFor(() => expect(line()).not.toBeInTheDocument())
})

test('in a filtered list, a record that no longer matches stays until the list is sorted again', async () => {
  show('/items?f.status=draft')
  await screen.findByText('2 of 6 items')
  await setStatus('Draft', 'Valid')
  expect(
    await screen.findByText('Changed records keep their place.'),
  ).toBeInTheDocument()
  expect(names()).toEqual(['Item 001', 'Item 004'])

  await userEvent.click(screen.getByRole('button', { name: 'Sort now' }))
  await waitFor(() => expect(names()).toEqual(['Item 004']))
})

test('a change that keeps the order shows no line', async () => {
  const source = show('/items?sort=status:asc')
  await screen.findByText('6 items')
  // A quantity changes, not the status the list is sorted by.
  const row = within(screen.getByRole('grid')).getAllByRole('row')[2]
  await userEvent.hover(row)
  const quantity = within(row).getByRole('textbox', { name: 'Quantity' })
  await userEvent.clear(quantity)
  await userEvent.type(quantity, '9{Enter}')
  await waitFor(() =>
    expect(source.items().find((i) => i.name === 'Item 004')?.quantity).toBe(9),
  )
  // The reload came back in the same order.
  await new Promise((done) => setTimeout(done, 200))
  expect(line()).not.toBeInTheDocument()
})
