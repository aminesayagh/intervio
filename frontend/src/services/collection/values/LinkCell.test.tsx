import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

// A wide list, so the website, email and phone columns fit in the table.
beforeAll(() => stubElementSizes({ width: 4000, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
const row = async (n: number) =>
  within(
    (await screen.findByRole('grid')).querySelectorAll(
      '[role="row"][data-key]',
    )[n - 1] as HTMLElement,
  )

test('a web address typed without https:// is saved with it, and opens in a new tab', async () => {
  const source = show()
  const field = (await row(1)).getByRole('textbox', { name: 'Website' })
  await userEvent.clear(field)
  await userEvent.type(field, 'intervio.example/pumps{Enter}')
  await waitFor(() =>
    expect(source.items()[0].website).toBe('https://intervio.example/pumps'),
  )
  const open = (await row(1)).getByRole('link', {
    name: 'Open intervio.example/pumps',
  })
  expect(open).toHaveAttribute('href', 'https://intervio.example/pumps')
  expect(open).toHaveAttribute('target', '_blank')
})

test('an email address that is not one goes back, with a message', async () => {
  const source = show()
  const field = (await row(2)).getByRole('textbox', { name: 'Email' })
  await userEvent.clear(field)
  await userEvent.type(field, 'not an address{Enter}')
  expect(
    await screen.findByText("That isn't an email address. It was put back."),
  ).toBeInTheDocument()
  expect(field).toHaveValue('item002@example.com')
  expect(source.items()[1].email).toBe('item002@example.com')
})

test('a phone number is saved, and its link dials the digits', async () => {
  const source = show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 003' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 003' })
  const field = within(aside).getByRole('textbox', { name: 'Phone' })
  await userEvent.clear(field)
  await userEvent.type(field, '+33 6 12 34 56 78{Enter}')
  await waitFor(() => expect(source.items()[2].phone).toBe('+33 6 12 34 56 78'))
  expect(
    within(aside).getByRole('link', { name: 'Open +33 6 12 34 56 78' }),
  ).toHaveAttribute('href', 'tel:+33612345678')
})

test('an empty value is allowed', async () => {
  const source = show()
  const field = (await row(1)).getByRole('textbox', { name: 'Email' })
  await userEvent.clear(field)
  await userEvent.tab()
  await waitFor(() => expect(source.items()[0].email).toBe(''))
})

test('without the right, the value is only a link', async () => {
  show(() => ({ edit: [] }))
  const cells = await row(1)
  expect(cells.queryByRole('textbox', { name: 'Email' })).toBeNull()
  expect(
    cells.getByRole('link', { name: 'item001@example.com' }),
  ).toHaveAttribute('href', 'mailto:item001@example.com')
})

test('a location is any address, and its link opens it in a map', async () => {
  const source = show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 002' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 002' })
  const field = within(aside).getByRole('textbox', { name: 'Location' })
  await userEvent.clear(field)
  await userEvent.type(field, 'Building B, Lyon{Enter}')
  await waitFor(() =>
    expect(source.items()[1].location).toBe('Building B, Lyon'),
  )
  const map = within(aside).getByRole('link', { name: 'Open Building B, Lyon' })
  expect(map).toHaveAttribute(
    'href',
    'https://www.openstreetmap.org/search?query=Building%20B%2C%20Lyon',
  )
  expect(map).toHaveAttribute('target', '_blank')
})

test('without the right, a location is only its map link', async () => {
  show(() => ({ edit: [] }))
  const cells = await row(1)
  expect(cells.queryByRole('textbox', { name: 'Location' })).toBeNull()
  expect(
    cells.getByRole('link', { name: '1 rue de la Paix, 75002 Paris, France' }),
  ).toHaveAttribute('target', '_blank')
})
