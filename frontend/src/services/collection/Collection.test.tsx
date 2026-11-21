import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import { cleanup } from '@testing-library/react'
import '../i18n'
import { Collection } from './Collection'
import { itemSource, makeItems } from './testing/items'
import { renderAt } from './testing/render'
import { itemDefinition } from './testing/testDefinition'

afterEach(cleanup)

test('the first page shows 30 items as cards, with the total', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  expect(await screen.findByText('42 items')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(30)
  expect(screen.getByText('Item 001')).toBeInTheDocument()
})

test('the table view shows a header row and one row per item', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(5)))} />,
  )
  await screen.findByText('5 items')
  await userEvent.click(screen.getByRole('button', { name: 'Table' }))

  const table = screen.getByRole('table', { name: 'Items' })
  const headers = within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent)
  expect(headers).toEqual(['Name', 'Status', 'Owner', 'Quantity', 'Updated'])
  expect(within(table).getAllByRole('row')).toHaveLength(1 + 5)
  expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('placeholders show while the first page loads', async () => {
  const source = itemSource(makeItems(3))
  source.settings.latencyMs = 50
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  expect(
    screen.getByRole('status', { name: 'Loading records' }),
  ).toBeInTheDocument()
  expect(await screen.findByText('Item 001')).toBeInTheDocument()
  expect(
    screen.queryByRole('status', { name: 'Loading records' }),
  ).not.toBeInTheDocument()
})

test('an empty collection shows its own empty message', async () => {
  renderAt('/items', <Collection definition={itemDefinition(itemSource([]))} />)
  expect(
    await screen.findByRole('heading', { name: 'No items yet' }),
  ).toBeInTheDocument()
  expect(
    screen.getByText('Add the first one to find it here later.'),
  ).toBeInTheDocument()
  expect(screen.getByText('0 items')).toBeInTheDocument()
})

test('a failed first page shows Retry, and Retry loads it', async () => {
  const source = itemSource(makeItems(3))
  source.settings.failing = true
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  expect(
    await screen.findByText('Records could not be loaded.'),
  ).toBeInTheDocument()

  source.settings.failing = false
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.getByText('3 items')).toBeInTheDocument())
  expect(
    screen.queryByText('Records could not be loaded.'),
  ).not.toBeInTheDocument()
})
