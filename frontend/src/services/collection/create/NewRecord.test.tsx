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
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

function show(url = '/items') {
  const source = itemSource(makeItems(5))
  renderAt(
    url,
    <Collection definition={itemDefinition(source)} basePath="/items" />,
  )
  return source
}

async function startNew() {
  await userEvent.click(
    await screen.findByRole('button', { name: '+ Add item' }),
  )
  return screen.findByRole('complementary', { name: '+ Add item' })
}

test('a new record is created once named, goes on top, and opens', async () => {
  const source = show()
  const aside = await startNew()
  expect(within(aside).getByText('Not saved yet')).toBeInTheDocument()
  expect(window.location.search).toContain('new=1')
  const name = within(aside).getByRole('textbox', { name: 'Title' })
  expect(name).toHaveFocus()

  await userEvent.type(name, 'Pump seals{Enter}')
  await waitFor(() => expect(source.items()[0].name).toBe('Pump seals'))
  expect(source.items()[0].status).toBe('draft')
  expect(
    await screen.findByRole('complementary', { name: 'Pump seals' }),
  ).toBeInTheDocument()
  expect(window.location.search).toContain(`open=${source.items()[0].id}`)
  expect(screen.getByText('6 items')).toBeInTheDocument()
  expect(screen.getAllByText('Record created').length).toBeGreaterThan(0)
})

test('Undo removes the record just created', async () => {
  const source = show()
  const aside = await startNew()
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Short-lived{Enter}',
  )
  await screen.findByRole('complementary', { name: 'Short-lived' })
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
  await waitFor(() => expect(source.items()).toHaveLength(5))
  await waitFor(() =>
    expect(
      screen.queryByRole('complementary', { name: 'Short-lived' }),
    ).not.toBeInTheDocument(),
  )
})

test('a filter with one value chosen sets that value on the new record', async () => {
  const source = show('/items?f.status=valid')
  const aside = await startNew()
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Filtered{Enter}',
  )
  await waitFor(() => expect(source.items()[0].name).toBe('Filtered'))
  expect(source.items()[0].status).toBe('valid')
})

test('closing an untouched new record just closes; with input, it asks first', async () => {
  show()
  let aside = await startNew()
  await userEvent.click(within(aside).getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(window.location.search).not.toContain('new=1'))
  expect(screen.queryByRole('alertdialog')).toBeNull()

  aside = await startNew()
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Status: Draft' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: 'Valid' }),
  )
  await userEvent.click(within(aside).getByRole('button', { name: 'Close' }))
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Discard this new record?',
  })
  await userEvent.click(within(dialog).getByRole('button', { name: 'Discard' }))
  await waitFor(() => expect(window.location.search).not.toContain('new=1'))
})

test('a refresh keeps what was typed in a new record', async () => {
  renderAt(
    '/items?new=1',
    <Collection definition={itemDefinition(itemSource(makeItems(5)))} />,
    {
      'intervio.collection.test-items.new': JSON.stringify({
        name: '',
        status: 'outdated',
      }),
    },
  )
  const aside = await screen.findByRole('complementary', { name: '+ Add item' })
  expect(
    within(aside).getByRole('button', { name: 'Status: Outdated' }),
  ).toBeInTheDocument()
})

test('what is typed while the record is being created is saved on it', async () => {
  const source = itemSource(makeItems(5))
  const definition = itemDefinition(source)
  // The creation waits until the test lets it finish: what is typed meanwhile is
  // typed while it is running, however slow the machine.
  let finish = () => {}
  const held = new Promise<void>((done) => (finish = done))
  const create = source.create!
  definition.source = {
    ...source,
    create: async (values, context) => {
      await held
      return create(values, context)
    },
  }
  renderAt('/items', <Collection definition={definition} basePath="/items" />)
  const aside = await startNew()
  const name = within(aside).getByRole('textbox', { name: 'Title' })
  await userEvent.type(name, 'Gasket{Enter}') // ready: the creation starts
  await userEvent.type(name, 's{Enter}') // typed before it comes back
  finish()
  await waitFor(() => expect(source.items()[0].name).toBe('Gaskets'))
})

test('without a way to remove records, "Record created" offers no Undo', async () => {
  const source = itemSource(makeItems(5))
  const definition = itemDefinition(source)
  definition.source = { ...source, remove: undefined }
  renderAt('/items', <Collection definition={definition} basePath="/items" />)
  const aside = await startNew()
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Kept{Enter}',
  )
  expect((await screen.findAllByText('Record created')).length).toBeGreaterThan(
    0,
  )
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
})
