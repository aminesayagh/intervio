import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { reachValue } from '../testing/panel'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

// A wide list, so the Icon column fits in the table.
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

test('an icon chosen in the grid is saved at once', async () => {
  const source = show()
  // Item 001 has the wrench.
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Icon: wrench' }),
  )
  await userEvent.click(await screen.findByRole('option', { name: 'flame' }))
  await waitFor(() => expect(source.items()[0].icon).toBe('flame'))
  expect(
    (await row(1)).getByRole('button', { name: 'Icon: flame' }),
  ).toBeInTheDocument()
})

test('the search narrows the grid', async () => {
  show()
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Icon: wrench' }),
  )
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Search icons' }),
    'ther',
  )
  expect(
    screen.getAllByRole('option').map((o) => o.getAttribute('aria-label')),
  ).toEqual(['thermometer'])
  await userEvent.clear(screen.getByRole('textbox', { name: 'Search icons' }))
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Search icons' }),
    'zzz',
  )
  expect(screen.getByText('No icons match.')).toBeInTheDocument()
})

test('Remove clears the icon', async () => {
  const source = show()
  await userEvent.click(
    (await row(2)).getByRole('button', { name: 'Icon: hammer' }),
  )
  await userEvent.click(
    await screen.findByRole('button', { name: 'Remove the icon' }),
  )
  await waitFor(() => expect(source.items()[1].icon).toBeNull())
})

test('a refused icon goes back, with a message', async () => {
  const source = show()
  source.settings.failing = true
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Icon: wrench' }),
  )
  await userEvent.click(await screen.findByRole('option', { name: 'gauge' }))
  expect(
    await screen.findByText("“Icon” couldn't be saved for Item 001."),
  ).toBeInTheDocument()
  expect(
    (await row(1)).getByRole('button', { name: 'Icon: wrench' }),
  ).toBeInTheDocument()
})

test('the panel chooses an icon too, even where there was none', async () => {
  const source = show()
  // Item 004 has no icon.
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 004' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 004' })
  await reachValue(aside, 'Icon')
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Icon: None' }),
  )
  await userEvent.click(await screen.findByRole('option', { name: 'truck' }))
  await waitFor(() => expect(source.items()[3].icon).toBe('truck'))
})

test('without the right, the icon is shown only', async () => {
  show(() => ({ edit: [] }))
  expect((await row(1)).queryByRole('button', { name: /^Icon/ })).toBeNull()
})
