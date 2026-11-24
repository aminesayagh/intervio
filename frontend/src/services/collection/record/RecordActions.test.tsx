import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

const id = (n: number) => makeItems(n)[n - 1].id

function show(url = '/items', rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    url,
    <Collection
      definition={itemDefinition(source, 'test-items', rights)}
      basePath="/items"
    />,
  )
  return source
}

async function openMenu(name = 'Item 002') {
  await userEvent.click(
    await screen.findByRole('button', { name: `Open ${name}` }),
  )
  const aside = await screen.findByRole('complementary', { name })
  await userEvent.click(
    within(aside).getByRole('button', { name: 'More actions' }),
  )
  return aside
}

test('Remove asks first; confirming removes the record and closes the panel', async () => {
  const source = show()
  await openMenu()
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }))
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Remove this item?',
  })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))

  await waitFor(() =>
    expect(source.items().some((item) => item.id === id(2))).toBe(false),
  )
  await waitFor(() =>
    expect(
      screen.queryByRole('complementary', { name: 'Item 002' }),
    ).not.toBeInTheDocument(),
  )
  expect(screen.queryByDisplayValue('Item 002')).not.toBeInTheDocument()
  expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5')
})

test('Cancel keeps the record', async () => {
  const source = show()
  await openMenu()
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }))
  const dialog = await screen.findByRole('alertdialog')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
  )
  expect(source.items()).toHaveLength(5)
  expect(
    screen.getByRole('complementary', { name: 'Item 002' }),
  ).toBeInTheDocument()
})

test('Archive takes the record out of the list', async () => {
  const source = show()
  await openMenu()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Archive' }),
  )
  await userEvent.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Archive',
    }),
  )
  await waitFor(() =>
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5'),
  )
  await expect(source.one(id(2))).rejects.toMatchObject({ status: 404 })
})

test('Copy link copies the address with the record open, and says so', async () => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  show()
  await openMenu()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Copy link' }),
  )
  expect(writeText).toHaveBeenCalledWith(
    `${window.location.origin}/items?open=${id(2)}`,
  )
  expect((await screen.findAllByText('Link copied')).length).toBeGreaterThan(0)
})

test('Open full page shows the record as the main view, with a breadcrumb back', async () => {
  show()
  await openMenu()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Open full page' }),
  )
  await waitFor(() => expect(window.location.pathname).toBe(`/items/${id(2)}`))
  const crumbs = await screen.findByRole('navigation', { name: 'Breadcrumb' })
  expect(within(crumbs).getByText('Item 002')).toBeInTheDocument()
  expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  // The page's menu has no Open full page.
  await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
  expect(screen.queryByRole('menuitem', { name: 'Open full page' })).toBeNull()
  await userEvent.keyboard('{Escape}')

  await userEvent.click(within(crumbs).getByRole('link', { name: 'Items' }))
  expect(
    await screen.findByRole('complementary', { name: 'Item 002' }),
  ).toBeInTheDocument()
  expect(window.location.search).toBe(`?open=${id(2)}`)
})

test('actions the person may not run are not offered', async () => {
  show('/items', () => ({ edit: ['status'], actions: [] }))
  await openMenu()
  expect(
    await screen.findByRole('menuitem', { name: 'Copy link' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('menuitem', { name: 'Remove' })).toBeNull()
  expect(screen.queryByRole('menuitem', { name: 'Archive' })).toBeNull()
})

test('closing with a description not saved yet asks first', async () => {
  show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 003' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 003' })
  sessionStorage.setItem(
    `intervio.collection.test-items.${id(3)}.description`,
    'draft',
  )
  await userEvent.click(within(aside).getByRole('button', { name: 'Close' }))
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Leave without saving?',
  })
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Leave anyway' }),
  )
  await waitFor(() =>
    expect(
      screen.queryByRole('complementary', { name: 'Item 003' }),
    ).not.toBeInTheDocument(),
  )
})
