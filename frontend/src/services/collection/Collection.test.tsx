import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../i18n'
import { Collection } from './Collection'
import { itemSource, makeItems } from './testing/items'
import { stubElementSizes } from './testing/layout'
import { renderAt } from './testing/render'
import { itemDefinition } from './testing/testDefinition'

beforeAll(() =>
  // A 400 px list with 152 px rows: only part of the first page is visible.
  stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }),
)
afterEach(cleanup)

/** The list's scroll area, scrolled to its end. */
function scrollToEnd(container: HTMLElement) {
  const area = container.querySelector<HTMLElement>('.overflow-y-auto')!
  area.scrollTop = 100_000
  fireEvent.scroll(area)
}

test('the first page shows a header row and the first items, with the total', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  expect(await screen.findByText('42 items')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument()
  const table = screen.getByRole('table', { name: 'Items' })
  const headers = within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent)
  expect(headers).toEqual(['Name', 'Status', 'Owner', 'Quantity', 'Updated'])
  expect(table).toHaveAttribute('aria-rowcount', '43')
  expect(within(table).getByText('Item 001')).toBeInTheDocument()
  // Only the visible rows are drawn, never a later page.
  expect(screen.queryByText('Item 031')).not.toBeInTheDocument()
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

test('scrolling near the end loads the next page once, until the end', async () => {
  const source = itemSource(makeItems(75))
  let calls = 0
  const list = source.list
  source.list = (query) => {
    calls += 1
    return list(query)
  }
  const { container } = renderAt(
    '/items',
    <Collection definition={itemDefinition(source)} />,
  )
  await screen.findByText('75 items')
  expect(calls).toBe(1)

  scrollToEnd(container)
  await waitFor(() => expect(calls).toBe(2))
  scrollToEnd(container)
  await waitFor(() => expect(calls).toBe(3))
  // The last page is loaded: scrolling again asks for nothing more.
  scrollToEnd(container)
  await new Promise((done) => setTimeout(done, 50))
  expect(calls).toBe(3)
})

test('a failed next page keeps the loaded items and offers Retry', async () => {
  const source = itemSource(makeItems(75))
  const { container } = renderAt(
    '/items',
    <Collection definition={itemDefinition(source)} />,
  )
  await screen.findByText('75 items')
  source.settings.failing = true
  scrollToEnd(container)
  expect(
    await screen.findByText('More records could not be loaded.', undefined, {
      timeout: 3000,
    }),
  ).toBeInTheDocument()

  source.settings.failing = false
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() =>
    expect(
      screen.queryByText('More records could not be loaded.'),
    ).not.toBeInTheDocument(),
  )
})
