import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../i18n'
import { Collection } from './Collection'
import { itemSource, makeItems } from './testing/items'
import { stubElementSizes } from './testing/layout'
import { seeSections } from './testing/panel'
import { renderAt } from './testing/render'
import { itemDefinition } from './testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

const id = (n: number) => makeItems(n)[n - 1].id

function show() {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source)} basePath="/items" />,
  )
  return source
}
async function open(name: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Open ${name}` }),
  )
  return screen.findByRole('complementary', { name })
}

test('a change to a record removed meanwhile refreshes the list, closes the panel, and says so', async () => {
  const source = show()
  const aside = await open('Item 002')
  await source.remove!(id(2)) // someone else removes it
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    ' X{Enter}',
  )
  expect(
    await screen.findByText(
      'Item 002 is no longer available. The list was refreshed.',
    ),
  ).toBeInTheDocument()
  await waitFor(() =>
    expect(
      screen.queryByRole('complementary', { name: 'Item 002' }),
    ).toBeNull(),
  )
  await waitFor(() =>
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5'),
  )
})

test('opening another record takes the previous record’s notifications away', async () => {
  const source = show()
  const aside = await open('Item 001')
  source.settings.forbidden = true
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    ' X{Enter}',
  )
  const text = 'You can no longer change “Name” on Item 001.'
  expect(await screen.findByText(text)).toBeInTheDocument()
  await open('Item 003')
  await waitFor(() => expect(screen.queryByText(text)).toBeNull())
})

test('a new record that fails to be created keeps what was typed, and Retry creates it', async () => {
  const source = show()
  await userEvent.click(await screen.findByRole('button', { name: 'New' }))
  const aside = await screen.findByRole('complementary', { name: '+ Add item' })
  source.settings.failNext = true
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Pump seals{Enter}',
  )
  expect(
    await screen.findByText("The record couldn't be created."),
  ).toBeInTheDocument()
  expect(within(aside).getByRole('textbox', { name: 'Title' })).toHaveValue(
    'Pump seals',
  )
  expect(source.items()).toHaveLength(5)

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(source.items()[0].name).toBe('Pump seals'))
  expect(
    await screen.findByRole('complementary', { name: 'Pump seals' }),
  ).toBeInTheDocument()
})

test('an action that fails says so, with Retry', async () => {
  const source = show()
  const aside = await open('Item 002')
  await userEvent.click(
    within(aside).getByRole('button', { name: 'More actions' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Archive' }),
  )
  source.settings.failNext = true
  await userEvent.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Archive',
    }),
  )
  expect(
    await screen.findByText("Item 002 couldn't be archived."),
  ).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() =>
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5'),
  )
})

test('a link that cannot be copied says so', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(async () => Promise.reject(new Error('blocked'))),
    },
    configurable: true,
  })
  show()
  const aside = await open('Item 002')
  await userEvent.click(
    within(aside).getByRole('button', { name: 'More actions' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Copy link' }),
  )
  expect(
    await screen.findByText("The link couldn't be copied."),
  ).toBeInTheDocument()
})

test('an Undo that fails says the record stays', async () => {
  const source = show()
  await userEvent.click(await screen.findByRole('button', { name: 'New' }))
  const aside = await screen.findByRole('complementary', { name: '+ Add item' })
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Jack{Enter}',
  )
  const jack = await screen.findByRole('complementary', { name: 'Jack' })
  // Its linked records load first (they ask the same source), then the Undo fails.
  seeSections()
  const linked = (await within(jack).findByText('Linked items')).closest(
    'section',
  )!
  await waitFor(() => expect(linked.textContent).toMatch(/\d/))
  source.settings.failNext = true
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(
    await screen.findByText("Jack couldn't be removed."),
  ).toBeInTheDocument()
  expect(source.items()[0].name).toBe('Jack')
})
