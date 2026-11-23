import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../i18n'
import { Collection } from './Collection'
import { itemSource, makeItems } from './testing/items'
import { reachListEnd, stubElementSizes } from './testing/layout'
import { renderAt } from './testing/render'
import { itemDefinition } from './testing/testDefinition'

beforeAll(() =>
  // A 400 px list with 152 px rows: only part of the first page is visible.
  stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }),
)
afterEach(cleanup)

/**
 * The list scrolled to its end: the virtualized table draws its last rows and its
 * load-more item, which then sees the end (React Aria's IntersectionObserver).
 */
function scrollToEnd() {
  const grid = screen.getByRole('grid')
  act(() => {
    grid.scrollTop = 1_000_000
    fireEvent.scroll(grid)
  })
  act(() => reachListEnd())
}

test('the first page shows a header row and the first items, with the total', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  expect(await screen.findByText('42 items')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument()
  const table = screen.getByRole('grid', { name: 'Items' })
  const headers = within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent)
    // The first is the selection checkbox's column.
    .filter(Boolean)
  // The columns that fit 1128 px by their widths, in the definition's order.
  expect(headers).toEqual([
    'Name',
    'Status',
    'Owner',
    'Quantity',
    'Active',
    'Tags',
    'Updated',
  ])
  // React Aria counts the rows loaded (the first page of 30, and the header).
  expect(table).toHaveAttribute('aria-rowcount', '31')
  expect(within(table).getByDisplayValue('Item 001')).toBeInTheDocument()
  // Only the visible rows are drawn, never a later page.
  expect(screen.queryByDisplayValue('Item 031')).not.toBeInTheDocument()
})

test('placeholders show while the first page loads', async () => {
  const source = itemSource(makeItems(3))
  source.settings.latencyMs = 50
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  expect(
    screen.getByRole('status', { name: 'Loading records' }),
  ).toBeInTheDocument()
  expect(await screen.findByDisplayValue('Item 001')).toBeInTheDocument()
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
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByText('75 items')
  expect(calls).toBe(1)

  scrollToEnd()
  await waitFor(() => expect(calls).toBe(2))
  scrollToEnd()
  await waitFor(() => expect(calls).toBe(3))
  // The last page is loaded: scrolling again asks for nothing more.
  scrollToEnd()
  await new Promise((done) => setTimeout(done, 50))
  expect(calls).toBe(3)
})

test('a failed next page keeps the loaded items and offers Retry', async () => {
  const source = itemSource(makeItems(75))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByText('75 items')
  source.settings.failing = true
  scrollToEnd()
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

/** The first row's name: an editable field, so its value. */
const firstName = () =>
  within(screen.getByRole('grid'))
    .getAllByRole('row')[1]
    .querySelector<HTMLInputElement>('input[aria-label="Name"]')!.value

test('a search waits for typing to stop, then narrows the list and the address', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  await screen.findByText('42 items')
  await userEvent.type(
    screen.getByRole('searchbox', { name: 'Search' }),
    'item 02',
  )
  expect(window.location.search).toBe('') // not yet: 250 ms after the last key
  expect(await screen.findByText('10 of 42 items')).toBeInTheDocument()
  expect(window.location.search).toBe('?q=item+02')
  expect(firstName()).toBe('Item 020')
})

test('a filter menu narrows the list, shows its count, and Clear filters resets', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(30)))} />,
  )
  await screen.findByText('30 items')
  await userEvent.click(screen.getByRole('button', { name: 'Status' }))
  await userEvent.click(
    await screen.findByRole('menuitemcheckbox', { name: 'Valid' }),
  )
  await userEvent.keyboard('{Escape}')

  expect(await screen.findByText('10 of 30 items')).toBeInTheDocument()
  expect(window.location.search).toBe('?f.status=valid')
  expect(screen.getByRole('button', { name: 'Status' })).toHaveTextContent(
    'Status (1)',
  )

  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(await screen.findByText('30 items')).toBeInTheDocument()
  expect(window.location.search).toBe('')
})

test('a search with no match shows its message, with Clear filters', async () => {
  renderAt(
    '/items?q=nothing',
    <Collection definition={itemDefinition(itemSource(makeItems(5)))} />,
  )
  expect(
    await screen.findByRole('heading', {
      name: 'No records match your search',
    }),
  ).toBeInTheDocument()
  await userEvent.click(
    screen.getAllByRole('button', { name: 'Clear filters' })[0],
  )
  expect(await screen.findByText('5 items')).toBeInTheDocument()
})

test('a column header sorts, then reverses, then goes back to the default order', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  await screen.findByText('42 items')
  expect(screen.getByRole('columnheader', { name: /Updated/ })).toHaveAttribute(
    'aria-sort',
    'none',
  )

  await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }))
  await waitFor(() => expect(window.location.search).toBe('?sort=name:asc'))
  expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await waitFor(() => expect(firstName()).toBe('Item 001'))

  await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }))
  await waitFor(() => expect(firstName()).toBe('Item 042'))
  await waitFor(() => expect(window.location.search).toBe('?sort=name:desc'))

  // A third click goes back to the default order, and the sort leaves the address.
  await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }))
  await waitFor(() => expect(window.location.search).toBe(''))
  expect(screen.getByRole('columnheader', { name: /Updated/ })).toHaveAttribute(
    'aria-sort',
    'none',
  )
  // Columns without a sort don't offer one.
  expect(
    screen.getByRole('columnheader', { name: /Owner/ }),
  ).not.toHaveAttribute('aria-sort')
})

test('an address opens the list it describes', async () => {
  renderAt(
    '/items?q=item&f.status=draft&sort=name:desc',
    <Collection definition={itemDefinition(itemSource(makeItems(30)))} />,
  )
  expect(await screen.findByText('10 of 30 items')).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('item')
  expect(firstName()).toBe('Item 028')
})

test('the search field keeps a trailing space while the search is trimmed', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  await screen.findByText('42 items')
  const field = screen.getByRole('searchbox', { name: 'Search' })
  await userEvent.type(field, 'item 02 ')
  expect(await screen.findByText('10 of 42 items')).toBeInTheDocument()
  expect(window.location.search).toBe('?q=item+02')
  expect(field).toHaveValue('item 02 ')

  // A change from elsewhere still reaches the field.
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  await waitFor(() => expect(field).toHaveValue(''))
})

test('the default column cycles the same way: chosen, reversed, then no sort', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(42)))} />,
  )
  await screen.findByText('42 items')
  const header = () => screen.getByRole('columnheader', { name: /Updated/ })
  const button = () => screen.getByRole('columnheader', { name: /Updated/ })
  expect(header()).toHaveAttribute('aria-sort', 'none')

  await userEvent.click(button())
  await waitFor(() => expect(window.location.search).toBe('?sort=updated:desc'))
  expect(header()).toHaveAttribute('aria-sort', 'descending')

  await userEvent.click(button())
  await waitFor(() => expect(firstName()).toBe('Item 042'))
  expect(header()).toHaveAttribute('aria-sort', 'ascending')

  await userEvent.click(button())
  await waitFor(() => expect(window.location.search).toBe(''))
  expect(header()).toHaveAttribute('aria-sort', 'none')
  await waitFor(() => expect(firstName()).toBe('Item 001'))
})

test('a name edited in its cell is saved when the cell is left', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  const field = await screen.findByDisplayValue('Item 001')
  await userEvent.clear(field)
  await userEvent.type(field, 'Hydraulic jack')
  expect(source.items()[0].name).toBe('Item 001') // not while typing
  await userEvent.tab()
  await waitFor(() => expect(source.items()[0].name).toBe('Hydraulic jack'))
  expect(field).toHaveValue('Hydraulic jack')
})

test('Enter saves, Escape puts the saved name back', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  const field = await screen.findByDisplayValue('Item 002')
  await userEvent.type(field, ' A{Enter}')
  await waitFor(() => expect(source.items()[1].name).toBe('Item 002 A'))

  await userEvent.type(field, ' B{Escape}')
  expect(field).toHaveValue('Item 002 A')
  expect(source.items()[1].name).toBe('Item 002 A')
})

test('an empty name is refused with a message, and the name comes back', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  const field = await screen.findByDisplayValue('Item 003')
  await userEvent.clear(field)
  await userEvent.tab()
  // The value goes back, and a notification says why (decision 132).
  expect(
    await screen.findByText("The name can't be empty. It was put back."),
  ).toBeInTheDocument()
  expect(field).toHaveValue('Item 003')
  expect(source.items()[2].name).toBe('Item 003')
})

test('a save the server refuses puts the name back, with a message', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  const field = await screen.findByDisplayValue('Item 004')
  source.settings.failing = true
  await userEvent.type(field, ' X')
  await userEvent.tab()
  expect(
    await screen.findByText("“Name” couldn't be saved for Item 004."),
  ).toBeInTheDocument()
  expect(field).toHaveValue('Item 004')

  // Retry sends the same change again.
  source.settings.failing = false
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(source.items()[3].name).toBe('Item 004 X'))
  await waitFor(() =>
    expect(
      screen.queryByText("“Name” couldn't be saved for Item 004."),
    ).toBeNull(),
  )
})

test('a status is chosen from its chip, and saved at once', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByText('5 items')
  const rows = within(screen.getByRole('grid')).getAllByRole('row')
  await userEvent.click(
    within(rows[1]).getByRole('button', { name: 'Status: Draft' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Outdated' }),
  )

  await waitFor(() => expect(source.items()[0].status).toBe('outdated'))
  expect(
    within(rows[1]).getByRole('button', { name: 'Status: Outdated' }),
  ).toBeInTheDocument()
})

test('a status the server refuses goes back, with a message', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByText('5 items')
  const rows = within(screen.getByRole('grid')).getAllByRole('row')
  source.settings.failing = true
  await userEvent.click(
    within(rows[2]).getByRole('button', { name: 'Status: Valid' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Draft' }),
  )

  expect(
    await screen.findByText("“Status” couldn't be saved for Item 002."),
  ).toBeInTheDocument()
  expect(
    within(rows[2]).getByRole('button', { name: 'Status: Valid' }),
  ).toBeInTheDocument()
  expect(source.items()[1].status).toBe('valid')
})

test('an owner is chosen from its cell, and saved at once', async () => {
  const source = itemSource(makeItems(5))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByText('5 items')
  const rows = within(screen.getByRole('grid')).getAllByRole('row')
  await userEvent.click(
    within(rows[1]).getByRole('button', { name: 'Owner: Julie Moreau' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Omar Haddad' }),
  )
  await waitFor(() => expect(source.items()[0].owner).toBe('Omar Haddad'))
})

test('coming back from the sidebar reopens the record open last', async () => {
  const id = makeItems(3)[2].id
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(5)))} />,
    { 'intervio.collection.test-items.list': `f.status=draft&open=${id}` },
  )
  expect(
    await screen.findByRole('complementary', { name: 'Item 003' }),
  ).toBeInTheDocument()
  expect(window.location.search).toBe(`?f.status=draft&open=${id}`)
})
