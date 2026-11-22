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

const id = (n: number) => makeItems(n)[n - 1].id
const panel = () => screen.queryByRole('complementary', { name: /Item/ })

function show(url = '/items') {
  const source = itemSource(makeItems(10))
  renderAt(url, <Collection definition={itemDefinition(source)} />)
  return source
}

test('Open shows the record beside the list, marks its row, and adds it to the address', async () => {
  show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 002' }),
  )

  const aside = await screen.findByRole('complementary', { name: 'Item 002' })
  expect(within(aside).getByRole('heading', { name: 'Item 002' })).toHaveFocus()
  expect(within(aside).getByText('Valid')).toBeInTheDocument()
  expect(within(aside).getByText('Karim Benali')).toBeInTheDocument()
  expect(within(aside).getByText('Linked items')).toBeInTheDocument()
  expect(window.location.search).toBe(`?open=${id(2)}`)
  const row = within(screen.getByRole('grid'))
    .getByDisplayValue('Item 002')
    .closest('[role="row"]')!
  expect(row).toHaveAttribute('data-current', 'true')
})

test('switching records replaces the entry, so × and Back both close', async () => {
  show()
  const start = window.history.length
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  expect(window.history.length).toBe(start + 1)
  await userEvent.click(screen.getByRole('button', { name: 'Open Item 003' }))
  expect(
    await screen.findByRole('complementary', { name: 'Item 003' }),
  ).toBeInTheDocument()
  expect(window.history.length).toBe(start + 1)

  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(panel()).not.toBeInTheDocument())
  expect(window.location.search).toBe('')

  await userEvent.click(screen.getByRole('button', { name: 'Open Item 004' }))
  await screen.findByRole('complementary', { name: 'Item 004' })
  act(() => window.history.back())
  await waitFor(() => expect(panel()).not.toBeInTheDocument())
})

test('a link opens its record; closing it stays on the page', async () => {
  show(`/items?open=${id(5)}`)
  expect(
    await screen.findByRole('complementary', { name: 'Item 005' }),
  ).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(panel()).not.toBeInTheDocument())
  expect(window.location.pathname).toBe('/items')
  expect(window.location.search).toBe('')
})

test('with the panel open, ↓ and ↑ open the next and previous records; Escape closes', async () => {
  show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  await screen.findByRole('complementary', { name: 'Item 001' })
  await userEvent.keyboard('{ArrowDown}')
  expect(
    await screen.findByRole('complementary', { name: 'Item 002' }),
  ).toBeInTheDocument()
  await userEvent.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}')
  expect(
    await screen.findByRole('complementary', { name: 'Item 001' }),
  ).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(panel()).not.toBeInTheDocument())
})

test('a record removed since the list loaded says so, and leaves the list', async () => {
  const source = show()
  await screen.findByDisplayValue('Item 006')
  await source.remove!(id(6)) // removed on the server; the list still shows it
  await userEvent.click(screen.getByRole('button', { name: 'Open Item 006' }))
  expect(
    await screen.findByText('This record is no longer available.'),
  ).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.queryByDisplayValue('Item 006')).not.toBeInTheDocument(),
  )
})

test('a link to a record that does not exist says so', async () => {
  show('/items?open=00000000-0000-7000-8000-000000000999')
  expect(
    await screen.findByText('This record is no longer available.'),
  ).toBeInTheDocument()
})

test('clicking an editable name edits it instead of opening the record', async () => {
  show()
  await userEvent.click(await screen.findByDisplayValue('Item 007'))
  expect(panel()).not.toBeInTheDocument()
  expect(window.location.search).toBe('')
})

async function openFirst(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  return { source, aside }
}

test('the panel edits the title in place, and the list follows', async () => {
  const { source, aside } = await openFirst()
  const title = within(aside).getByRole('textbox', { name: 'Title' })
  await userEvent.clear(title)
  await userEvent.type(title, 'Hydraulic jack{Enter}')
  await waitFor(() => expect(source.items()[0].name).toBe('Hydraulic jack'))
  expect(
    within(screen.getByRole('grid')).getByDisplayValue('Hydraulic jack'),
  ).toBeInTheDocument()
})

test('the panel chooses a status, and edits the quantity as a number', async () => {
  const { source, aside } = await openFirst()
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Status: Draft' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Valid' }),
  )
  await waitFor(() => expect(source.items()[0].status).toBe('valid'))

  // Item 001 has no quantity: type one; the number field saves on Enter.
  const quantity = within(aside).getByRole('textbox', { name: 'Quantity' })
  await userEvent.type(quantity, '3{Enter}')
  await waitFor(() => expect(source.items()[0].quantity).toBe(3))
})

test('rights decide value by value, in the table and the panel', async () => {
  const { aside } = await openFirst(() => ({ edit: ['status'] }))
  const table = screen.getByRole('grid')
  expect(within(table).queryByRole('textbox')).not.toBeInTheDocument() // names read only
  expect(
    within(table).getAllByRole('button', { name: /^Status:/ }).length,
  ).toBeGreaterThan(0)
  expect(
    within(table).queryByRole('button', { name: /^Owner:/ }),
  ).not.toBeInTheDocument()

  expect(within(aside).queryByRole('textbox')).not.toBeInTheDocument() // title, quantity
  expect(
    within(aside).getByRole('button', { name: 'Status: Draft' }),
  ).toBeInTheDocument()
  expect(within(aside).queryByText('View only')).not.toBeInTheDocument()
})

test('with no right at all, the panel says View only and edits nothing', async () => {
  const { aside } = await openFirst(() => ({ edit: [] }))
  expect(within(aside).getByText('View only')).toBeInTheDocument()
  expect(within(aside).queryByRole('textbox')).not.toBeInTheDocument()
  expect(
    within(aside).queryByRole('button', { name: /^Status:/ }),
  ).not.toBeInTheDocument()
})

test('a change refused as no longer allowed says so, and the value comes back', async () => {
  const { source, aside } = await openFirst()
  source.settings.forbidden = true
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    ' X{Enter}',
  )
  expect(
    await screen.findByText('You can no longer change “Name” on Item 001.'),
  ).toBeInTheDocument()
  expect(within(aside).getByRole('textbox', { name: 'Title' })).toHaveValue(
    'Item 001',
  )
})
